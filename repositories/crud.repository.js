
class CrudRepository {

  constructor(model) {
    this.model = model;
  }

  async create(data) {
    return await this.model.create(data);
  }

  async getById(id) {
    return await this.model.findByPk(id);
  }

  async getAll(filter = {}) {
    return await this.model.findAll({
      where: filter,
    });
  }

  async getOne(filter = {}) {
    return await this.model.findOne({
      where: filter,
    });
  }

  async update(id, data) {
    return await this.model.update(
      data,
      {
        where: { id },
      }
    );
  }

  async delete(id) {
    return await this.model.destroy({
      where: { id },
    });
  }
}

module.exports = CrudRepository;
