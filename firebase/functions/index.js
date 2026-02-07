const admin = require("firebase-admin");
admin.initializeApp();

// Import function modules
const products = require("./src/products");
const metalRates = require("./src/metalRates");
const priceCalculation = require("./src/priceCalculation");
const orders = require("./src/orders");
const adminUsers = require("./src/adminUsers");
const images = require("./src/images");
const users = require("./src/users");

// ============================================
// PRODUCT FUNCTIONS
// ============================================
exports.createProduct = products.createProduct;
exports.updateProduct = products.updateProduct;
exports.deleteProduct = products.deleteProduct;
exports.restoreProduct = products.restoreProduct;
exports.getProduct = products.getProduct;
exports.listProducts = products.listProducts;
exports.generateProductCode = products.generateProductCode;

// ============================================
// METAL RATES FUNCTIONS
// ============================================
exports.updateMetalRates = metalRates.updateMetalRates;
exports.getMetalRates = metalRates.getMetalRates;

// ============================================
// PRICE CALCULATION (Firestore Trigger)
// ============================================
exports.onMetalRatesUpdate = priceCalculation.onMetalRatesUpdate;
exports.calculateProductPrice = priceCalculation.calculateProductPrice;
exports.calculateVariantPrice = priceCalculation.calculateVariantPrice;

// ============================================
// ORDER FUNCTIONS
// ============================================
exports.createOrder = orders.createOrder;
exports.listOrders = orders.listOrders;
exports.updateOrderStatus = orders.updateOrderStatus;
exports.getUserOrders = orders.getUserOrders;
exports.getOrderDetails = orders.getOrderDetails;

// ============================================
// ADMIN USER FUNCTIONS
// ============================================
exports.createAdmin = adminUsers.createAdmin;
exports.setAdminClaims = adminUsers.setAdminClaims;
exports.listAdmins = adminUsers.listAdmins;
exports.updateAdmin = adminUsers.updateAdmin;
exports.deactivateAdmin = adminUsers.deactivateAdmin;
exports.reactivateAdmin = adminUsers.reactivateAdmin;

// ============================================
// USER MANAGEMENT FUNCTIONS (Admin)
// ============================================
exports.listUsers = users.listUsers;
exports.getUserDetails = users.getUserDetails;
exports.updateUser = users.updateUser;
exports.deleteUser = users.deleteUser;
exports.getDashboardStats = users.getDashboardStats;

// ============================================
// IMAGE FUNCTIONS
// ============================================
exports.onImageUpload = images.onImageUpload;

// ============================================
// MOBILE APP FUNCTIONS
// ============================================
const mobileApp = require("./src/mobileApp");
exports.registerUser = mobileApp.registerUser;
exports.getUserProfile = mobileApp.getUserProfile;
exports.updateUserProfile = mobileApp.updateUserProfile;
exports.getCart = mobileApp.getCart;
exports.updateCart = mobileApp.updateCart;
exports.getFavorites = mobileApp.getFavorites;
exports.updateFavorites = mobileApp.updateFavorites;
exports.getAddresses = mobileApp.getAddresses;
exports.manageAddress = mobileApp.manageAddress;
exports.searchProducts = mobileApp.searchProducts;
exports.getProductsByCategory = mobileApp.getProductsByCategory;
exports.getHomePageData = mobileApp.getHomePageData;
exports.submitContactForm = mobileApp.submitContactForm;

// ============================================
// STORE FUNCTIONS
// ============================================
const stores = require("./src/stores");
exports.listStores = stores.listStores;
exports.getActiveStores = stores.getActiveStores;
exports.createStore = stores.createStore;
exports.updateStore = stores.updateStore;
exports.deleteStore = stores.deleteStore;
