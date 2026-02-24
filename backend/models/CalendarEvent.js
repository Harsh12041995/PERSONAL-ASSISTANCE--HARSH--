const mongoose = require('mongoose');

const CalendarEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    start: { type: String, required: true },
    end: { type: String, default: '' },
    calendar: { type: String, default: 'Primary' },
    allDay: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CalendarEvent', CalendarEventSchema);
