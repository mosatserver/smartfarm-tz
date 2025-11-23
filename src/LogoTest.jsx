import React from 'react';
import logo from './images/logo.jpg';

// Simple logo test component to debug display issues
export default function LogoTest() {
  return (
    <div style={{ padding: '20px', backgroundColor: 'white', border: '2px solid red' }}>
      <h2>Logo Test Component</h2>
      
      {/* Test 1: Basic img tag with inline styles */}
      <div>
        <h3>Test 1: Basic Image</h3>
        <img 
          src={logo} 
          alt="Logo Test 1" 
          style={{
            width: '100px', 
            height: '100px',
            border: '2px solid blue',
            objectFit: 'cover'
          }} 
        />
      </div>

      {/* Test 2: With CSS classes removed */}
      <div style={{ marginTop: '20px' }}>
        <h3>Test 2: Without CSS Classes</h3>
        <img 
          src={logo} 
          alt="Logo Test 2" 
          className=""
          style={{
            width: '100px', 
            height: '100px',
            border: '2px solid green',
            objectFit: 'cover'
          }} 
        />
      </div>

      {/* Test 3: Debug info */}
      <div style={{ marginTop: '20px' }}>
        <h3>Test 3: Debug Info</h3>
        <p>Logo import value: {logo}</p>
        <p>Logo type: {typeof logo}</p>
      </div>
    </div>
  );
}