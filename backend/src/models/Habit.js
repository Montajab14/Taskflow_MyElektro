const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    description: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true },
);

habitSchema.set('toJSON', {
  transform(doc, ret) {
    return {
      id: ret._id.toString(),
      name: ret.name,
      description: ret.description,
      createdAt: ret.createdAt,
      updatedAt: ret.updatedAt,
    };
  },
});

module.exports = mongoose.model('Habit', habitSchema);
