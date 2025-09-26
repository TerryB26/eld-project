import React, { useState } from 'react';
import axios from 'axios';
import { ELDAlert } from './ELDAlert';
import './AddDriverForm.css';

const AddDriverForm = ({ onDriverAdded, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    license_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Driver name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Driver name must be at least 2 characters';
    }
    
    if (!formData.license_number.trim()) {
      newErrors.license_number = 'License number is required';
    } else if (formData.license_number.trim().length < 5) {
      newErrors.license_number = 'License number must be at least 5 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:6800/api/drivers/', {
        name: formData.name.trim(),
        license_number: formData.license_number.trim()
      });
      
      // Reset form
      setFormData({ name: '', license_number: '' });
      setErrors({});
      
      // Show success message
      ELDAlert.success(
        'Driver Added Successfully!',
        `${response.data.name} has been added to the system`
      );
      
      // Notify parent component
      if (onDriverAdded) {
        onDriverAdded(response.data);
      }
      
    } catch (error) {
      console.error('Error creating driver:', error);
      
      if (error.response?.data) {
        // Handle validation errors from backend
        const backendErrors = error.response.data;
        if (backendErrors.license_number) {
          setErrors({ license_number: 'This license number is already in use' });
        } else {
          setErrors({ general: 'Failed to create driver. Please try again.' });
          ELDAlert.error('Error', 'Failed to create driver. Please try again.');
        }
      } else {
        setErrors({ general: 'Network error. Please check your connection and try again.' });
        ELDAlert.networkError();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', license_number: '' });
    setErrors({});
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="add-driver-overlay">
      <div className="add-driver-form">
        <div className="form-header">
          <h2>Add New Driver</h2>
          <button 
            type="button" 
            className="close-btn"
            onClick={handleCancel}
            disabled={loading}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {errors.general && (
            <div className="error-message general-error">
              {errors.general}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="name">
              Driver Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter driver's full name"
              disabled={loading}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && (
              <div className="error-message">{errors.name}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="license_number">
              License Number <span className="required">*</span>
            </label>
            <input
              type="text"
              id="license_number"
              name="license_number"
              value={formData.license_number}
              onChange={handleInputChange}
              placeholder="Enter CDL license number"
              disabled={loading}
              className={errors.license_number ? 'error' : ''}
            />
            {errors.license_number && (
              <div className="error-message">{errors.license_number}</div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Adding Driver...' : 'Add Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDriverForm;
