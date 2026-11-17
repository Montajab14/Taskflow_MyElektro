const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Facultatif : le formulaire d'inscription du front le demande.
    name: {
      type: String,
      trim: true,
      maxlength: 60,
      default: null,
    },
    // Uniquement le hash bcrypt, jamais le mot de passe en clair.
    // select: false : il faut le demander explicitement pour le lire.
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  transform(doc, ret) {
    return {
      id: ret._id.toString(),
      email: ret.email,
      name: ret.name ?? null,
      createdAt: ret.createdAt,
    };
  },
});

module.exports = mongoose.model('User', userSchema);
