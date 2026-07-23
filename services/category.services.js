const db = require("../models");
const AppError = require("../utils/errors/app.error");

class CategoryService {
  async getCategories() {
    return await db.Category.findAll({
      where: { status: "ACTIVE" },
      order: [["sort_order", "ASC"]]
    });
  }

  async getAdminCategories() {
    return await db.Category.findAll({
      order: [["sort_order", "ASC"]]
    });
  }

  async createCategory(data, userId) {
    const { name, slug, description, image, banner, icon, featured, popular, status, sortOrder } = data;
    if (!name || !slug) {
      throw new AppError("Category name and slug are required", 400);
    }
    const existing = await db.Category.findOne({ where: { slug } });
    if (existing) {
      throw new AppError("Category slug already exists", 400);
    }
    return await db.Category.create({
      name,
      slug,
      description,
      image,
      banner,
      icon,
      featured: featured || false,
      popular: popular || false,
      status: status || "ACTIVE",
      sortOrder: sortOrder || 0,
      createdBy: userId,
      updatedBy: userId
    });
  }

  async updateCategory(id, data, userId) {
    const category = await db.Category.findByPk(id);
    if (!category) {
      throw new AppError("Category not found", 404);
    }
    const { name, slug, description, image, banner, icon, featured, popular, status, sortOrder } = data;
    if (slug && slug !== category.slug) {
      const existing = await db.Category.findOne({ where: { slug } });
      if (existing) {
        throw new AppError("Category slug already exists", 400);
      }
    }
    await category.update({
      name: name !== undefined ? name : category.name,
      slug: slug !== undefined ? slug : category.slug,
      description: description !== undefined ? description : category.description,
      image: image !== undefined ? image : category.image,
      banner: banner !== undefined ? banner : category.banner,
      icon: icon !== undefined ? icon : category.icon,
      featured: featured !== undefined ? featured : category.featured,
      popular: popular !== undefined ? popular : category.popular,
      status: status !== undefined ? status : category.status,
      sortOrder: sortOrder !== undefined ? sortOrder : category.sortOrder,
      updatedBy: userId
    });
    return category;
  }

  async deleteCategory(id) {
    const category = await db.Category.findByPk(id);
    if (!category) {
      throw new AppError("Category not found", 404);
    }
    await category.destroy();
    return true;
  }

  async toggleStatus(id, userId) {
    const category = await db.Category.findByPk(id);
    if (!category) {
      throw new AppError("Category not found", 404);
    }
    const nextStatus = category.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await category.update({
      status: nextStatus,
      updatedBy: userId
    });
    return category;
  }
}

module.exports = new CategoryService();
