const CategoryService = require("../services/category.services");
const { SuccessResponse, ErrorResponse } = require("../utils/common");

async function getCategories(req, res) {
  try {
    const categories = await CategoryService.getCategories();
    return res.status(200).json(SuccessResponse("Categories fetched successfully", categories));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function adminGetCategories(req, res) {
  try {
    const categories = await CategoryService.getAdminCategories();
    return res.status(200).json(SuccessResponse("Admin categories fetched successfully", categories));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function adminCreateCategory(req, res) {
  try {
    const response = await CategoryService.createCategory(req.body, req.user.id);
    return res.status(201).json(SuccessResponse("Category created successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function adminUpdateCategory(req, res) {
  try {
    const response = await CategoryService.updateCategory(req.params.id, req.body, req.user.id);
    return res.status(200).json(SuccessResponse("Category updated successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function adminDeleteCategory(req, res) {
  try {
    await CategoryService.deleteCategory(req.params.id);
    return res.status(200).json(SuccessResponse("Category deleted successfully", { id: req.params.id }));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function adminToggleStatus(req, res) {
  try {
    const response = await CategoryService.toggleStatus(req.params.id, req.user.id);
    return res.status(200).json(SuccessResponse("Category status toggled successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  getCategories,
  adminGetCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminToggleStatus
};
