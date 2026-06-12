const Payment = require("../models");
const  CrudRepository  = require("./crud.repository");

class PaymentRepository extends CrudRepository {
  constructor() {
    super(Payment);
  }

//   async findByBooking(booking_id) {
//     return await db.Payment.findAll({
//       where: { booking_id },
//     });
//   }
}

module.exports =  PaymentRepository;