const {
  UserRepository,
  ArtistProfileRepository,
  NotificationRepository,
} = require("../repositories");
const AppError = require("../utils/errors/app.error");

const UserRepositor = new UserRepository();
const NotificationRepositor = new NotificationRepository();
const ArtistProfileRepositor = new ArtistProfileRepository();

class AdminService {
  async getAllUsers() {
    return await UserRepository.getAll();
  }

  async verifyArtist(id, data) {
    const artist = await ArtistProfileRepository.getById(id);

    if (!artist) {
      throw new AppError("Artist not found", 404);
    }

    await ArtistProfileRepository.update(id, {
      verification_status: data.verification_status,

      rejection_reason: data.rejection_reason || null,
    });

    return await ArtistProfileRepository.getById(id);
  }

  async getPendingArtists() {
    return await ArtistProfileRepositor.getPendingArtists();
  }
  async approveArtist(id) {
    const artist = await ArtistProfileRepositor.getArtistById(id);
    if (!artist) {
      throw new AppError("Artist not found", 404);
    }
    await ArtistProfileRepositor.update(id, {
      verification_status: "APPROVED",
    });
    await NotificationService.createNotification({
      user_id: artist.user_id,
      title: "Profile Approved",
      message: "Your artist profile has been approved",
      type: "ARTIST_APPROVED",
      is_read: false,
    });
    return true;
  }
  async rejectArtist(id, reason) {
    const artist = await ArtistProfileRepositor.getArtistById(id);
    if (!artist) {
      throw new AppError("Artist not found", 404);
    }
    await ArtistProfileRepositor.update(id, {
      verification_status: "REJECTED",
      rejection_reason: reason,
    });
    await NotificationService.createNotification({
      user_id: artist.user_id,
      title: "Profile Rejected",
      message: `Reason: ${reason}`,
      type: "ARTIST_REJECTED",
      is_read: false,
    });
    return true;
  }
}

module.exports = new AdminService();
