const db = require("../models");

const CrudRepository = require("./crud.repository");

class OtpRepository extends CrudRepository {
  constructor() {
    super(db.Otp);
  }
}

module.exports = OtpRepository;
