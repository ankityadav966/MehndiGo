const db = require("../models");
const { Op } = require("sequelize");

const allowedSlugs = [
  "bridal",
  "arabic",
  "indo-western",
  "minimalist",
  "festive",
  "custom",
  "royal-bridal",
  "traditional",
  "floral",
  "modern"
];

const categoryImages = {
  "bridal": "https://res.cloudinary.com/dair21jov/image/upload/v1784199936/mehndigo/categories/bridal.jpg",
  "arabic": "https://res.cloudinary.com/dair21jov/image/upload/v1784199939/mehndigo/categories/arabic.jpg",
  "indo-western": "https://res.cloudinary.com/dair21jov/image/upload/v1784200022/mehndigo/categories/indo-western.jpg",
  "minimalist": "https://res.cloudinary.com/dair21jov/image/upload/v1784199944/mehndigo/categories/minimalist.jpg",
  "festive": "https://res.cloudinary.com/dair21jov/image/upload/v1784199947/mehndigo/categories/festive.jpg",
  "custom": "https://res.cloudinary.com/dair21jov/image/upload/v1784199949/mehndigo/categories/custom.jpg",
  "royal-bridal": "https://res.cloudinary.com/dair21jov/image/upload/v1784200254/mehndigo/categories/royal-bridal.jpg",
  "traditional": "https://res.cloudinary.com/dair21jov/image/upload/v1784200257/mehndigo/categories/traditional.jpg",
  "floral": "https://res.cloudinary.com/dair21jov/image/upload/v1784200259/mehndigo/categories/floral.jpg",
  "modern": "https://res.cloudinary.com/dair21jov/image/upload/v1784200265/mehndigo/categories/modern.jpg"
};

async function run() {
  const transaction = await db.sequelize.transaction();
  try {
    console.log("Restricting database to exactly 10 categories...");

    // 1. Fetch the 10 categories to keep
    const keepCategories = await db.Category.findAll({
      where: {
        slug: {
          [Op.in]: allowedSlugs
        }
      },
      transaction
    });

    const keepIds = keepCategories.map(c => c.id);
    console.log(`Keeping category IDs: ${keepIds.join(", ")}`);

    // 2. Update any other services, bookings, or coupons referencing categories to be deleted
    // Get all category IDs to be deleted
    const deleteCategories = await db.Category.findAll({
      where: {
        slug: {
          [Op.notIn]: allowedSlugs
        }
      },
      transaction
    });
    const deleteIds = deleteCategories.map(c => c.id);
    console.log(`Deleting category IDs: ${deleteIds.join(", ")}`);

    if (deleteIds.length > 0) {
      // Find a default fallback category ID from our kept list (e.g., 'traditional' or first in list)
      const fallbackCategory = keepCategories.find(c => c.slug === "traditional") || keepCategories[0];
      const fallbackId = fallbackCategory.id;

      console.log(`Re-assigning references from deleted categories to fallback ID: ${fallbackId} (${fallbackCategory.name})`);

      // Update Services table category_id references if they exist
      if (db.Service || db.Services) {
        const serviceModel = db.Service || db.Services;
        await serviceModel.update(
          { category_id: fallbackId },
          {
            where: {
              category_id: { [Op.in]: deleteIds }
            },
            transaction
          }
        );
      }

      // Update Bookings table categoryId references if they exist
      if (db.Booking || db.Bookings) {
        const bookingModel = db.Booking || db.Bookings;
        await bookingModel.update(
          { categoryId: fallbackId },
          {
            where: {
              categoryId: { [Op.in]: deleteIds }
            },
            transaction
          }
        );
      }

      // 3. Delete excess categories
      await db.Category.destroy({
        where: {
          id: {
            [Op.in]: deleteIds
          }
        },
        transaction
      });
      console.log("Deleted excess category rows.");
    }

    // 4. Ensure all kept categories have their AI-generated Cloudinary URLs set
    for (const cat of keepCategories) {
      const imgUrl = categoryImages[cat.slug];
      if (imgUrl) {
        await cat.update({
          image: imgUrl,
          banner: imgUrl
        }, { transaction });
        console.log(`Ensured AI image for category ${cat.name} (${cat.slug}) is set.`);
      }
    }

    await transaction.commit();
    console.log("SUCCESS: Categories restricted to exactly 10 premium AI-generated entries!");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error("Failsafe migration failed:", error);
    process.exit(1);
  }
}

run();
