import Swal from 'sweetalert2';

// Custom SweetAlert2 configurations for the ELD app
export const ELDAlert = {
  // Success alerts
  success: (title, text, timer = 2000) => {
    return Swal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonColor: '#28a745',
      timer,
      timerProgressBar: true,
      showConfirmButton: timer ? false : true
    });
  },

  // Error alerts
  error: (title, text, details = null) => {
    return Swal.fire({
      icon: 'error',
      title,
      text,
      html: details,
      confirmButtonColor: '#dc3545',
      footer: details ? '<small>Check console for more details</small>' : null
    });
  },

  // Warning alerts
  warning: (title, text) => {
    return Swal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonColor: '#ffc107',
      confirmButtonText: 'OK'
    });
  },

  // Info alerts
  info: (title, text) => {
    return Swal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonColor: '#17a2b8'
    });
  },

  // Confirmation dialogs
  confirm: (title, text, confirmText = 'Yes', cancelText = 'No') => {
    return Swal.fire({
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: confirmText,
      cancelButtonText: cancelText
    });
  },

  // Loading/Progress alerts
  loading: (title = 'Please wait...', text = 'Processing your request') => {
    return Swal.fire({
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  },

  // Network error specific
  networkError: () => {
    return Swal.fire({
      icon: 'error',
      title: 'Backend Server Not Running',
      html: `
        <div style="text-align: left;">
          <p>Cannot connect to the backend server.</p>
          <p><strong>Please make sure:</strong></p>
          <ul>
            <li>Django server is running at <code>http://localhost:6800</code></li>
            <li>Run: <code>python manage.py runserver</code> in the backend directory</li>
            <li>Check your internet connection</li>
          </ul>
        </div>
      `,
      confirmButtonColor: '#dc3545',
      footer: '<small>Check the terminal for Django server status</small>',
      width: '500px'
    });
  },

  // HOS Violation alert
  hosViolation: (violations) => {
    const violationHtml = violations.map(v => 
      `<li><strong>${v.violation_type}:</strong> ${v.description}</li>`
    ).join('');
    
    return Swal.fire({
      icon: 'warning',
      title: 'HOS Violations Detected!',
      html: `
        <div style="text-align: left;">
          <p>The following HOS violations have been detected:</p>
          <ul>${violationHtml}</ul>
        </div>
      `,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'I Understand'
    });
  },

  // Status change confirmation
  statusChangeConfirm: (newStatus, location) => {
    const statusColors = {
      'OFF': '#28a745',
      'SB': '#007bff', 
      'DR': '#dc3545',
      'ON': '#ffc107'
    };
    
    const statusNames = {
      'OFF': 'Off Duty',
      'SB': 'Sleeper Berth',
      'DR': 'Driving', 
      'ON': 'On Duty (Not Driving)'
    };
    
    return Swal.fire({
      icon: 'question',
      title: 'Confirm Status Change',
      html: `
        <div style="text-align: center;">
          <p>Change duty status to:</p>
          <div style="padding: 15px; background: ${statusColors[newStatus]}; color: white; border-radius: 8px; margin: 10px 0; font-weight: bold;">
            ${statusNames[newStatus]}
          </div>
          <p><strong>Location:</strong> ${location}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: statusColors[newStatus],
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Confirm Change',
      cancelButtonText: 'Cancel'
    });
  }
};

export default ELDAlert;
