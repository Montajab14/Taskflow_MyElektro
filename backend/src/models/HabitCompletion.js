const mongoose = require('mongoose');

/**
 * Une réalisation datée : « l'habitude X a été faite le jour D ».
 * Le jour est stocké au format "YYYY-MM-DD", comme dueDate pour les tâches.
 * owner est recopié depuis l'habitude pour que chaque requête puisse filtrer
 * sur le propriétaire, comme pour les tâches.
 */
const habitCompletionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    habit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
    },
    date: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Une seule réalisation par habitude et par jour, garantie par la base.
habitCompletionSchema.index({ habit: 1, date: 1 }, { unique: true });
habitCompletionSchema.index({ owner: 1, date: 1 });

habitCompletionSchema.set('toJSON', {
  transform(doc, ret) {
    return { date: ret.date, createdAt: ret.createdAt };
  },
});

module.exports = mongoose.model('HabitCompletion', habitCompletionSchema);
