const mongoose = require('mongoose');

const STATUSES = ['todo', 'doing', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

const taskSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    description: { type: String, default: '', maxlength: 1000 },
    status: { type: String, required: true, enum: STATUSES },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    // Stockée telle quelle au format "YYYY-MM-DD" : pas de fuseau horaire qui
    // décale la date d'un jour, et l'ordre alphabétique est l'ordre chronologique.
    dueDate: { type: String, default: null },
  },
  { timestamps: true },
);

taskSchema.index({ owner: 1, status: 1 });

taskSchema.set('toJSON', {
  transform(doc, ret) {
    return {
      id: ret._id.toString(),
      title: ret.title,
      description: ret.description,
      status: ret.status,
      priority: ret.priority,
      dueDate: ret.dueDate,
      createdAt: ret.createdAt,
      updatedAt: ret.updatedAt,
    };
  },
});

module.exports = mongoose.model('Task', taskSchema);
module.exports.STATUSES = STATUSES;
module.exports.PRIORITIES = PRIORITIES;
