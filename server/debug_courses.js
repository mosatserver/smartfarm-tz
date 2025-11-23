const { pool } = require('./config/database');

async function debugCoursesQuery() {
  try {
    console.log('🔍 Testing courses query step by step...');

    // Test basic select on courses table
    console.log('\n1. Testing basic courses table access...');
    const [basicCourses] = await pool.execute('SELECT COUNT(*) as count FROM academy_courses');
    console.log('✅ Courses table accessible, count:', basicCourses[0].count);

    // Test users table access
    console.log('\n2. Testing users table access...');
    const [basicUsers] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE user_type = "expert"');
    console.log('✅ Users table accessible, expert users count:', basicUsers[0].count);

    // Test categories table access
    console.log('\n3. Testing categories table access...');
    const [basicCategories] = await pool.execute('SELECT COUNT(*) as count FROM academy_categories');
    console.log('✅ Categories table accessible, count:', basicCategories[0].count);

    // Test the exact query from the API with debug info
    console.log('\n4. Testing the actual API query...');
    const search = '';
    const category = '';
    const level = '';
    const is_free = '';
    const limit = 12;
    const offset = 0;
    
    let whereConditions = ['c.status = "published"'];
    const queryParams = [];

    // Add conditions as in the actual API
    if (search) {
      whereConditions.push('(c.title LIKE ? OR c.description LIKE ? OR c.short_description LIKE ? OR CONCAT(u.first_name, " ", u.last_name) LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (category && category !== 'all') {
      whereConditions.push('cat.name = ?');
      queryParams.push(category);
    }

    if (level && level !== 'all') {
      whereConditions.push('c.level = ?');
      queryParams.push(level);
    }

    if (is_free !== '') {
      whereConditions.push('c.is_free = ?');
      queryParams.push(is_free === 'true');
    }

    const whereClause = whereConditions.join(' AND ');
    
    // Validate sort and order parameters
    const validSortColumns = ['created_at', 'title', 'rating', 'enrollment_count'];
    const validOrders = ['ASC', 'DESC'];
    const sort = 'created_at';
    const order = 'DESC';
    const safeSortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const safeOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    console.log('Where clause:', whereClause);
    console.log('Query params:', queryParams);
    console.log('Sort column:', safeSortColumn);
    console.log('Sort order:', safeOrder);

    const coursesQuery = `
      SELECT 
        c.*,
        CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
        u.email as instructor_email,
        cat.name as category_name,
        cat.icon as category_icon
      FROM academy_courses c
      JOIN users u ON c.instructor_id = u.id
      JOIN academy_categories cat ON c.category_id = cat.id
      WHERE ${whereClause}
      ORDER BY c.${safeSortColumn} ${safeOrder}
      LIMIT ? OFFSET ?
    `;

    console.log('\nFull query:', coursesQuery);
    
    queryParams.push(parseInt(limit), parseInt(offset));
    
    console.log('Final query params:', queryParams);

    const [courses] = await pool.execute(coursesQuery, queryParams);
    console.log('✅ Courses query successful! Found', courses.length, 'courses');
    
    if (courses.length > 0) {
      console.log('First course title:', courses[0].title);
      console.log('First course instructor:', courses[0].instructor_name);
    }

    // Test count query as well
    console.log('\n5. Testing count query...');
    const countQuery = `
      SELECT COUNT(*) as total
      FROM academy_courses c
      JOIN users u ON c.instructor_id = u.id
      JOIN academy_categories cat ON c.category_id = cat.id
      WHERE ${whereClause}
    `;
    
    const [countResult] = await pool.execute(countQuery, queryParams.slice(0, -2));
    console.log('✅ Count query successful! Total:', countResult[0].total);

  } catch (error) {
    console.error('❌ Error during debug:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('SQL State:', error.sqlState);
  } finally {
    process.exit(0);
  }
}

debugCoursesQuery();
