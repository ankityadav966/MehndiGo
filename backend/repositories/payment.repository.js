const db = require("../models");
const CrudRepository = require("./crud.repository");

class PaymentRepository extends CrudRepository {
  constructor() {
    super(db.Payment);
  }
}

module.exports = PaymentRepository;