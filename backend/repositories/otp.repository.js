const db = require("../models");

const CrudRepository = require("./crud.repository");

class OtpRepository extends CrudRepository {
  constructor() {
    super(db.Otp);
  }

  async getLatestOtp(filter = {}) {
    return await this.model.findOne({
      where: filter,
      order: [["createdAt", "DESC"]],
    });
  }
}

module.exports = OtpRepository;
