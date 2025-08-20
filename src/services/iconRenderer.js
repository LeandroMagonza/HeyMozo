// Icon mapping service for React Icons
import React from 'react';
import {
  // General Icons
  FaUser, FaBell, FaClock, FaCheckCircle, FaExclamationTriangle, FaQuestionCircle,
  FaInfoCircle, FaCog, FaHome, FaSearch, FaPlus, FaMinus, FaEdit, FaTrash,
  
  // Restaurant Icons
  
  FaUtensils, FaWineGlassAlt, FaCoffee, FaPizzaSlice, FaConciergeBell,
  FaGlassCheers, FaBreadSlice, FaFish, FaAppleAlt, FaCarrot,
  
  // Medical Icons
  FaUserMd, FaNotesMedical, FaAmbulance, FaHeartbeat, FaPrescriptionBottle,
  FaFirstAid, FaStethoscope, FaSyringe, FaPills, FaHospital,
  
  // Hotel Icons
  FaBed, FaKey, FaSuitcase, FaWifi, FaCar, FaSwimmingPool,
  FaShower, FaTv, FaPhone, 
  
  // Service Icons
  FaTools, FaCloudDownloadAlt, FaShoppingCart, FaEnvelope, FaCalendar,
  FaClipboard, FaFileAlt, FaPrint, FaCopy, FaShare,
  
  // Emergency Icons
  FaFire, FaShieldAlt, FaExclamationCircle, FaBolt, 
  // Business Icons
  FaUserTie, FaBuilding, FaBriefcase, FaHandshake, FaChartBar,
  FaFileInvoiceDollar, FaCreditCard, FaMoneyBillWave, FaReceipt,
  
  // Communication Icons
  FaPhoneAlt, FaCommentDots, FaVideo, FaMicrophone, FaVolumeUp,
  
  // Navigation Icons
  FaArrowUp, FaArrowDown, FaArrowLeft, FaArrowRight, FaChevronUp,
  FaChevronDown, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';

// Icon mapping object
const iconMap = {
  // General
  'FaUser': FaUser,
  'FaBell': FaBell,
  'FaClock': FaClock,
  'FaCheckCircle': FaCheckCircle,
  'FaExclamationTriangle': FaExclamationTriangle,
  'FaQuestionCircle': FaQuestionCircle,
  'FaInfoCircle': FaInfoCircle,
  'FaCog': FaCog,
  'FaHome': FaHome,
  'FaSearch': FaSearch,
  'FaPlus': FaPlus,
  'FaMinus': FaMinus,
  'FaEdit': FaEdit,
  'FaTrash': FaTrash,
  
  // Restaurant
  'FaUtensils': FaUtensils,
  'FaWineGlassAlt': FaWineGlassAlt,
  'FaCoffee': FaCoffee,
  'FaPizzaSlice': FaPizzaSlice,
  'FaGlassCheers': FaGlassCheers,
  'FaBreadSlice': FaBreadSlice,
  'FaFish': FaFish,
  'FaAppleAlt': FaAppleAlt,
  'FaCarrot': FaCarrot,  
  'FaConciergeBell': FaConciergeBell,

  
  // Medical
  'FaUserMd': FaUserMd,
  'FaNotesMedical': FaNotesMedical,
  'FaAmbulance': FaAmbulance,
  'FaHeartbeat': FaHeartbeat,
  'FaPrescriptionBottle': FaPrescriptionBottle,
  'FaFirstAid': FaFirstAid,
  'FaStethoscope': FaStethoscope,
  'FaSyringe': FaSyringe,
  'FaPills': FaPills,
  'FaHospital': FaHospital,
  
  // Hotel
  'FaBed': FaBed,
  'FaKey': FaKey,
  'FaSuitcase': FaSuitcase,
  'FaWifi': FaWifi,
  'FaCar': FaCar,
  'FaSwimmingPool': FaSwimmingPool,
  'FaShower': FaShower,
  'FaTv': FaTv,
  'FaPhone': FaPhone,
  
  // Service
  'FaTools': FaTools,
  'FaCloudDownloadAlt': FaCloudDownloadAlt,
  'FaShoppingCart': FaShoppingCart,
  'FaEnvelope': FaEnvelope,
  'FaCalendar': FaCalendar,
  'FaClipboard': FaClipboard,
  'FaFileAlt': FaFileAlt,
  'FaPrint': FaPrint,
  'FaCopy': FaCopy,
  'FaShare': FaShare,
  
  // Emergency
  'FaFire': FaFire,
  'FaShieldAlt': FaShieldAlt,
  'FaExclamationCircle': FaExclamationCircle,
  'FaBolt': FaBolt,
  'FaExclamationTriangle': FaExclamationTriangle,
  
  // Business
  'FaUserTie': FaUserTie,
  'FaBuilding': FaBuilding,
  'FaBriefcase': FaBriefcase,
  'FaHandshake': FaHandshake,
  'FaChartBar': FaChartBar,
  'FaFileInvoiceDollar': FaFileInvoiceDollar,
  'FaCreditCard': FaCreditCard,
  'FaMoneyBillWave': FaMoneyBillWave,
  'FaReceipt': FaReceipt,
  
  // Communication
  'FaPhoneAlt': FaPhoneAlt,
  'FaCommentDots': FaCommentDots,
  'FaVideo': FaVideo,
  'FaMicrophone': FaMicrophone,
  'FaVolumeUp': FaVolumeUp,
  
  // Navigation
  'FaArrowUp': FaArrowUp,
  'FaArrowDown': FaArrowDown,
  'FaArrowLeft': FaArrowLeft,
  'FaArrowRight': FaArrowRight,
  'FaChevronUp': FaChevronUp,
  'FaChevronDown': FaChevronDown,
  'FaChevronLeft': FaChevronLeft,
  'FaChevronRight': FaChevronRight
};

// Icon categories for the picker
export const iconCategories = {
  general: {
    name: 'General',
    icons: ['FaUser', 'FaBell', 'FaClock', 'FaCheckCircle', 'FaExclamationTriangle', 'FaQuestionCircle', 'FaInfoCircle', 'FaCog', 'FaHome', 'FaSearch', 'FaPlus', 'FaMinus', 'FaEdit', 'FaTrash']
  },
  restaurant: {
    name: 'Restaurant',
    icons: ['FaUtensils', 'FaWineGlassAlt', 'FaConciergeBell', 'FaCoffee', 'FaPizzaSlice', 'FaGlassCheers', 'FaBreadSlice', 'FaFish', 'FaAppleAlt', 'FaCarrot']
  },
  medical: {
    name: 'Medical',
    icons: ['FaUserMd', 'FaNotesMedical', 'FaAmbulance', 'FaHeartbeat', 'FaPrescriptionBottle', 'FaFirstAid', 'FaStethoscope', 'FaSyringe', 'FaPills', 'FaHospital']
  },
  hotel: {
    name: 'Hotel',
    icons: ['FaBed', 'FaKey', 'FaSuitcase', 'FaWifi', 'FaCar', 'FaSwimmingPool', 'FaShower', 'FaTv', 'FaPhone', 'FaConciergeBell']
  },
  service: {
    name: 'Service',
    icons: ['FaTools', 'FaCloudDownloadAlt', 'FaShoppingCart', 'FaEnvelope', 'FaCalendar', 'FaClipboard', 'FaFileAlt', 'FaPrint', 'FaCopy', 'FaShare']
  },
  emergency: {
    name: 'Emergency',
    icons: ['FaFire', 'FaShieldAlt', 'FaExclamationCircle', 'FaBolt', 'FaExclamationTriangle', 'FaFirstAid']
  },
  business: {
    name: 'Business',
    icons: ['FaUserTie', 'FaBuilding', 'FaBriefcase', 'FaHandshake', 'FaChartBar', 'FaFileInvoiceDollar', 'FaCreditCard', 'FaMoneyBillWave', 'FaReceipt']
  },
  communication: {
    name: 'Communication',
    icons: ['FaPhoneAlt', 'FaCommentDots', 'FaVideo', 'FaMicrophone', 'FaVolumeUp', 'FaEnvelope', 'FaBell']
  }
};

// Get all available icons as a flat array
export const getAllIcons = () => {
  return Object.keys(iconMap);
};

// Search icons by name
export const searchIcons = (searchTerm) => {
  if (!searchTerm) return getAllIcons();
  
  const lowercaseSearch = searchTerm.toLowerCase();
  return Object.keys(iconMap).filter(iconName =>
    iconName.toLowerCase().includes(lowercaseSearch)
  );
};

// Get icons by category
export const getIconsByCategory = (category) => {
  return iconCategories[category]?.icons || [];
};

// Main icon renderer component
const IconRenderer = ({ iconName, className = '', style = {}, size = '1em', ...props }) => {
  if (!iconName || !iconMap[iconName]) {
    return null;
  }
  
  const IconComponent = iconMap[iconName];
  
  return (
    <IconComponent
      className={`event-icon ${className}`}
      style={{ fontSize: size, ...style }}
      {...props}
    />
  );
};

// Utility function to check if an icon exists
export const isValidIcon = (iconName) => {
  return iconName && iconMap.hasOwnProperty(iconName);
};

// Get icon component directly (for advanced usage)
export const getIconComponent = (iconName) => {
  return iconMap[iconName] || null;
};

export default IconRenderer;