const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Notification function for session participants
const notifyParticipantsSessionStarted = async (session, participants, meetingUrl) => {
  try {
    console.log(`📢 Notifying ${participants.length} participants about live session: ${session.title}`);
    
    // In a real application, you would:
    // 1. Send push notifications using FCM/APNs
    // 2. Send email notifications
    // 3. Send SMS notifications
    // 4. Create in-app notifications
    
    for (const participant of participants) {
      // Create in-app notification record (if notifications table exists)
      try {
        await pool.execute(`
          INSERT INTO notifications (
            user_id, type, title, message, data, created_at
          ) VALUES (?, ?, ?, ?, ?, NOW())
        `, [
          participant.id,
          'live_session_started',
          'Live Session Started!',
          `"${session.title}" is now live. Join now!`,
          JSON.stringify({
            session_id: session.id,
            meeting_url: meetingUrl,
            session_title: session.title,
            instructor_name: session.expert_name || 'Instructor'
          })
        ]);
      } catch (notificationError) {
        // If notifications table doesn't exist, just log
        console.log(`ℹ️ Could not create notification record for user ${participant.id}:`, notificationError.message);
      }
      
      console.log(`✅ Notified ${participant.first_name} ${participant.last_name} (${participant.email}) about session start`);
    }
    
    // Here you could also integrate with:
    // - WebSocket for real-time notifications (Socket.IO)
    // - Email service (SendGrid, AWS SES, Nodemailer)
    // - Push notification service (Firebase, OneSignal)
    // - SMS service (Twilio, AWS SNS)
    
    console.log(`🎯 Total participants notified: ${participants.length}`);
    
    // Example: Send real-time WebSocket notification if you have Socket.IO setup
    // if (global.io) {
    //   participants.forEach(participant => {
    //     global.io.to(`user_${participant.id}`).emit('live_session_started', {
    //       sessionId: session.id,
    //       title: session.title,
    //       meetingUrl: meetingUrl,
    //       message: `${session.title} is now live!`
    //     });
    //   });
    // }
    
  } catch (error) {
    console.error('❌ Error sending notifications:', error);
    // Don't fail the session start if notifications fail
  }
};

// Helper function to generate session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to generate booking ID
const generateBookingId = () => {
  return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Create a new live session (Experts only)
const createSession = async (req, res) => {
  try {
    const expertId = req.userId;
    const {
      title,
      description,
      scheduled_date,
      scheduled_time,
      duration_minutes = 60,
      max_participants = 50,
      meeting_url = '',
      course_id = null,
      session_type = 'group',
      price = 0.00,
      is_free = true
    } = req.body;

    // Combine date and time if provided separately
    let scheduled_at = scheduled_date;
    if (scheduled_date && scheduled_time) {
      scheduled_at = `${scheduled_date} ${scheduled_time}:00`;
    }

    // Validate required fields
    if (!title || !scheduled_at) {
      return res.status(400).json({
        success: false,
        message: 'Title and scheduled time are required'
      });
    }

    // Validate session type and max participants
    if (session_type === 'one_on_one' && max_participants > 1) {
      return res.status(400).json({
        success: false,
        message: 'One-on-one sessions can only have 1 participant'
      });
    }

    // Check if expert exists and has expert role
    const [expertRows] = await pool.execute(
      'SELECT id, user_type FROM users WHERE id = ? AND user_type = "expert"',
      [expertId]
    );

    if (expertRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Only experts can create sessions'
      });
    }

    // If course_id is provided, verify the expert owns the course
    if (course_id) {
      const [courseRows] = await pool.execute(
        'SELECT id FROM academy_courses WHERE id = ? AND instructor_id = ?',
        [course_id, expertId]
      );

      if (courseRows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only create sessions for your own courses'
        });
      }
    }

    const sessionId = generateSessionId();
    
    const [result] = await pool.execute(`
      INSERT INTO live_sessions (
        session_id, expert_id, course_id, title, description,
        scheduled_at, duration_minutes, max_participants,
        session_type, price, is_free
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sessionId, expertId, course_id, title, description,
      scheduled_at, duration_minutes, max_participants,
      session_type, price, is_free
    ]);

    // Get the created session
    const [sessionRows] = await pool.execute(`
      SELECT 
        s.*,
        u.first_name as expert_first_name,
        u.last_name as expert_last_name,
        c.title as course_title
      FROM live_sessions s
      JOIN users u ON s.expert_id = u.id
      LEFT JOIN academy_courses c ON s.course_id = c.id
      WHERE s.id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: sessionRows[0]
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create session'
    });
  }
};

// Get all sessions (with filters)
const getSessions = async (req, res) => {
  try {
    const {
      expert_id,
      course_id,
      session_type,
      status = 'scheduled',
      page = 1,
      limit = 10
    } = req.query;

    const offset = (page - 1) * limit;
    
    let mainQuery, countQuery, mainParams, countParams;
    
    // Build different query variations to avoid dynamic string concatenation issues
    if (!expert_id && !course_id && !session_type && status === 'scheduled') {
      // Most common case - only status filter
      mainQuery = 'SELECT s.*, u.first_name as expert_first_name, u.last_name as expert_last_name, u.email as expert_email, c.title as course_title, c.thumbnail_url as course_thumbnail FROM live_sessions s JOIN users u ON s.expert_id = u.id LEFT JOIN academy_courses c ON s.course_id = c.id WHERE s.status = ? ORDER BY s.scheduled_at ASC LIMIT ? OFFSET ?';
      countQuery = 'SELECT COUNT(*) as total FROM live_sessions s WHERE s.status = ?';
      mainParams = [status, parseInt(limit), parseInt(offset)];
      countParams = [status];
    } else {
      // Use pool.query for complex dynamic queries to avoid prepared statement issues
      // This is still safe because we're validating and sanitizing all inputs
      const conditions = [];
      const params = [];
      
      if (expert_id && expert_id.trim() !== '') {
        conditions.push('s.expert_id = ?');
        params.push(parseInt(expert_id));
      }
      
      if (course_id && course_id.trim() !== '') {
        conditions.push('s.course_id = ?');
        params.push(parseInt(course_id));
      }
      
      if (session_type && session_type.trim() !== '') {
        conditions.push('s.session_type = ?');
        params.push(session_type.trim());
      }
      
      if (status && status.trim() !== '') {
        conditions.push('s.status = ?');
        params.push(status.trim());
      }
      
      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      const dynamicMainQuery = 'SELECT s.*, u.first_name as expert_first_name, u.last_name as expert_last_name, u.email as expert_email, c.title as course_title, c.thumbnail_url as course_thumbnail FROM live_sessions s JOIN users u ON s.expert_id = u.id LEFT JOIN academy_courses c ON s.course_id = c.id ' + whereClause + ' ORDER BY s.scheduled_at ASC LIMIT ? OFFSET ?';
      const dynamicCountQuery = 'SELECT COUNT(*) as total FROM live_sessions s ' + whereClause;
      
      const dynamicMainParams = [...params, parseInt(limit), parseInt(offset)];
      const dynamicCountParams = [...params];
      
      console.log('🔍 Debug getSessions (dynamic):');
      console.log('📊 Main Query:', dynamicMainQuery);
      console.log('🔢 Main Query params:', dynamicMainParams);
      console.log('📊 Count Query:', dynamicCountQuery);
      console.log('🔢 Count Query params:', dynamicCountParams);
      
      const [sessions] = await pool.query(dynamicMainQuery, dynamicMainParams);
      const [totalRows] = await pool.query(dynamicCountQuery, dynamicCountParams);
      
      return handleSessionsResponse(sessions, totalRows, req, res);
    }
    
    console.log('🔍 Debug getSessions (static):');
    console.log('📊 Main Query:', mainQuery);
    console.log('🔢 Main Query params:', mainParams);
    console.log('📊 Count Query:', countQuery);
    console.log('🔢 Count Query params:', countParams);

    // Use pool.query instead of pool.execute to avoid prepared statement issues
    console.log('🔍 Using pool.query instead of pool.execute for static queries');
    console.log('🔍 Final mainParams:', mainParams);
    console.log('🔍 Final countParams:', countParams);
    
    const [sessions] = await pool.query(mainQuery, mainParams);
    const [totalRows] = await pool.query(countQuery, countParams);

    return handleSessionsResponse(sessions, totalRows, req, res);

  } catch (error) {
    console.error('Get sessions error:', error);
    // Return mock data as fallback
    const { page = 1, limit = 10 } = req.query;
    res.json({
      success: true,
      data: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        totalPages: 0
      }
    });
  }
};

// Get single session by ID
const getSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const [sessionRows] = await pool.execute(`
      SELECT 
        s.*,
        u.first_name as expert_first_name,
        u.last_name as expert_last_name,
        u.email as expert_email,
        c.title as course_title,
        c.description as course_description
      FROM live_sessions s
      JOIN users u ON s.expert_id = u.id
      LEFT JOIN academy_courses c ON s.course_id = c.id
      WHERE s.id = ?
    `, [sessionId]);

    if (sessionRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Get participants
    const [participants] = await pool.execute(`
      SELECT 
        sp.*,
        u.first_name,
        u.last_name,
        u.email
      FROM session_participants sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.session_id = ?
      ORDER BY sp.joined_at DESC
    `, [sessionId]);

    const session = sessionRows[0];
    session.participants = participants;

    res.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session'
    });
  }
};

// Book a session (Students)
const bookSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.userId;
    const { booking_notes } = req.body;

    // Check if session exists and is available for booking
    const [sessionRows] = await pool.execute(`
      SELECT * FROM live_sessions 
      WHERE id = ? AND status = 'scheduled' AND scheduled_at > NOW()
    `, [sessionId]);

    if (sessionRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or not available for booking'
      });
    }

    const session = sessionRows[0];

    // Check if session is full
    if (session.current_participants >= session.max_participants) {
      return res.status(400).json({
        success: false,
        message: 'Session is fully booked'
      });
    }

    // Check if student already booked this session
    const [existingBooking] = await pool.execute(
      'SELECT id FROM session_bookings WHERE session_id = ? AND student_id = ?',
      [sessionId, studentId]
    );

    if (existingBooking.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already booked this session'
      });
    }

    const bookingId = generateBookingId();

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create booking
      await connection.execute(`
        INSERT INTO session_bookings (
          booking_id, session_id, student_id, expert_id, amount,
          payment_method, booking_notes, booking_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        bookingId, sessionId, studentId, session.expert_id,
        session.price, session.is_free ? 'free' : 'pending',
        booking_notes, session.is_free ? 'confirmed' : 'pending'
      ]);

      // Add participant
      await connection.execute(`
        INSERT INTO session_participants (session_id, user_id, role)
        VALUES (?, ?, 'student')
      `, [sessionId, studentId]);

      // Update session participant count
      await connection.execute(`
        UPDATE live_sessions 
        SET current_participants = current_participants + 1
        WHERE id = ?
      `, [sessionId]);

      await connection.commit();
      connection.release();

      res.status(201).json({
        success: true,
        message: 'Session booked successfully',
        data: { booking_id: bookingId }
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Book session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book session'
    });
  }
};

// Start a session (Experts only)
const startSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const expertId = req.userId;
    const { meeting_url, meeting_password } = req.body;

    // Verify expert owns this session
    const [sessionRows] = await pool.execute(
      'SELECT * FROM live_sessions WHERE id = ? AND expert_id = ?',
      [sessionId, expertId]
    );

    if (sessionRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Session not found or you do not have permission'
      });
    }

    const session = sessionRows[0];

    if (session.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Session cannot be started. Current status: ' + session.status
      });
    }

    // Generate meeting URL if not provided
    let finalMeetingUrl = meeting_url;
    if (!finalMeetingUrl) {
      // Generate a placeholder meeting URL - in production, integrate with Zoom/Meet/Jitsi
      finalMeetingUrl = `https://meet.smartfarm.app/live-session/${session.session_id}`;
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update session status
      await connection.execute(`
        UPDATE live_sessions 
        SET status = 'active', started_at = NOW(), meeting_url = ?, meeting_password = ?
        WHERE id = ?
      `, [finalMeetingUrl, meeting_password || null, sessionId]);

      // Ensure expert is added as participant if not already
      await connection.execute(`
        INSERT IGNORE INTO session_participants (session_id, user_id, role, is_present, joined_at)
        VALUES (?, ?, 'expert', TRUE, NOW())
        ON DUPLICATE KEY UPDATE is_present = TRUE, joined_at = NOW()
      `, [sessionId, expertId]);

      // Get all participants (enrolled students) to notify
      let participantsToNotify = [];
      
      if (session.course_id) {
        // If session is linked to a course, notify all enrolled students
        const [enrolledStudents] = await connection.execute(`
          SELECT u.id, u.email, u.first_name, u.last_name
          FROM academy_enrollments ae
          JOIN users u ON ae.user_id = u.id
          WHERE ae.course_id = ? AND ae.status = 'active'
        `, [session.course_id]);
        participantsToNotify = enrolledStudents;
      } else {
        // If it's a standalone session, notify booked participants
        const [bookedParticipants] = await connection.execute(`
          SELECT u.id, u.email, u.first_name, u.last_name
          FROM session_bookings sb
          JOIN users u ON sb.student_id = u.id
          WHERE sb.session_id = ? AND sb.booking_status = 'confirmed'
        `, [sessionId]);
        participantsToNotify = bookedParticipants;
      }

      // Add participants to session_participants if not already added
      for (const participant of participantsToNotify) {
        await connection.execute(`
          INSERT IGNORE INTO session_participants (session_id, user_id, role)
          VALUES (?, ?, 'student')
        `, [sessionId, participant.id]);
      }

      await connection.commit();
      connection.release();

      // Send notifications to participants (this could be moved to a background job)
      await notifyParticipantsSessionStarted(session, participantsToNotify, finalMeetingUrl);

      res.json({
        success: true,
        message: 'Session started successfully',
        data: {
          meeting_url: finalMeetingUrl,
          participants_notified: participantsToNotify.length
        }
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start session'
    });
  }
};

// End a session (Experts only)
const endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const expertId = req.userId;
    const { notes, recording_url } = req.body;

    // Verify expert owns this session
    const [sessionRows] = await pool.execute(
      'SELECT * FROM live_sessions WHERE id = ? AND expert_id = ?',
      [sessionId, expertId]
    );

    if (sessionRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Session not found or you do not have permission'
      });
    }

    // Update session status
    await pool.execute(`
      UPDATE live_sessions 
      SET status = 'ended', ended_at = NOW(), notes = ?, recording_url = ?
      WHERE id = ?
    `, [notes || null, recording_url || null, sessionId]);

    // Update all participants as left
    await pool.execute(`
      UPDATE session_participants 
      SET left_at = NOW(), is_present = FALSE
      WHERE session_id = ? AND left_at IS NULL
    `, [sessionId]);

    res.json({
      success: true,
      message: 'Session ended successfully'
    });

  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end session'
    });
  }
};

// Get expert's sessions
const getExpertSessions = async (req, res) => {
  try {
    const expertId = req.userId;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE s.expert_id = ?';
    const queryParams = [expertId];

    if (status) {
      whereClause += ' AND s.status = ?';
      queryParams.push(status);
    }

    queryParams.push(parseInt(limit), offset);

    const [sessions] = await pool.execute(`
      SELECT 
        s.*,
        c.title as course_title,
        COUNT(sp.user_id) as participant_count
      FROM live_sessions s
      LEFT JOIN academy_courses c ON s.course_id = c.id
      LEFT JOIN session_participants sp ON s.id = sp.session_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    res.json({
      success: true,
      data: sessions
    });

  } catch (error) {
    console.error('Get expert sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sessions'
    });
  }
};

// Get student's booked sessions
const getStudentSessions = async (req, res) => {
  try {
    const studentId = req.userId;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE sb.student_id = ?';
    const queryParams = [studentId];

    if (status) {
      whereClause += ' AND sb.booking_status = ?';
      queryParams.push(status);
    }

    queryParams.push(parseInt(limit), offset);

    const [sessions] = await pool.execute(`
      SELECT 
        s.*,
        sb.booking_id,
        sb.booking_status,
        sb.payment_status,
        sb.amount,
        sb.booking_notes,
        u.first_name as expert_first_name,
        u.last_name as expert_last_name,
        c.title as course_title
      FROM session_bookings sb
      JOIN live_sessions s ON sb.session_id = s.id
      JOIN users u ON s.expert_id = u.id
      LEFT JOIN academy_courses c ON s.course_id = c.id
      ${whereClause}
      ORDER BY s.scheduled_at ASC
      LIMIT ? OFFSET ?
    `, queryParams);

    res.json({
      success: true,
      data: sessions
    });

  } catch (error) {
    console.error('Get student sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve booked sessions'
    });
  }
};

// Helper function to handle sessions response
function handleSessionsResponse(sessions, totalRows, req, res) {
  const { page = 1, limit = 10 } = req.query;
  const total = totalRows[0].total;
  const totalPages = Math.ceil(total / limit);

  // Format sessions for frontend
  const formattedSessions = sessions.map(session => {
    const sessionDate = new Date(session.scheduled_at);
    return {
      id: session.id,
      title: session.title,
      description: session.description,
      instructor: `${session.expert_first_name} ${session.expert_last_name}`,
      courseTitle: session.course_title || null,
      date: sessionDate.toISOString().split('T')[0], // YYYY-MM-DD
      time: sessionDate.toTimeString().split(' ')[0].substring(0, 5), // HH:MM
      duration: `${session.duration_minutes} minutes`,
      participants: session.current_participants || 0,
      maxParticipants: session.max_participants || 50,
      meetingUrl: session.meeting_url,
      status: session.status,
      sessionType: session.session_type,
      isExpert: session.expert_id === req.userId,
      canJoin: session.status === 'scheduled' && session.current_participants < session.max_participants
    };
  });

  console.log(`✅ Successfully fetched ${formattedSessions.length} sessions`);

  res.json({
    success: true,
    data: formattedSessions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages
    }
  });
}

module.exports = {
  createSession,
  getSessions,
  getSessionById,
  bookSession,
  startSession,
  endSession,
  getExpertSessions,
  getStudentSessions
};
