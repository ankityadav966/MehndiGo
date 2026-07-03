module.exports = {
  orders: {
    create: async () => {
      throw new Error("Razorpay is disabled");
    }
  }
};
