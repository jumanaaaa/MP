const Capacity = require('../models/capacity');

exports.addCapacity = async (req, res) => {
  try {
    const { category, project, activity, startTime, endTime, date } = req.body;

    // Calculate duration
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const durationInHours = (endHour + endMin / 60) - (startHour + startMin / 60);

    const newEntry = await Capacity.create({
      user: req.user._id,
      category,
      project,
      activity,
      startTime,
      endTime,
      durationInHours,
      date
    });

    res.status(201).json(newEntry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
exports.getMyCapacities = async (req, res) => {
  try {
    const capacities = await Capacity.find({ user: req.user._id }).sort({ date: -1 });
    res.json(capacities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch capacity entries' });
  }
};
exports.updateCapacity = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const capacity = await Capacity.findById(id);

    if (!capacity) {
      return res.status(404).json({ error: 'Capacity entry not found' });
    }

    // ✅ If user is not the owner and not an admin, deny update
    if (req.user.role !== 'admin' && capacity.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this entry' });
    }

    // Apply updates
    Object.assign(capacity, updates);

    // Optional: recalculate duration if start or end time changed
    if (updates.startTime && updates.endTime) {
      const [startH, startM] = updates.startTime.split(':').map(Number);
      const [endH, endM] = updates.endTime.split(':').map(Number);
      capacity.durationInHours = (endH + endM / 60) - (startH + startM / 60);
    }

    await capacity.save();

    res.json({ message: 'Capacity entry updated', capacity });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
exports.deleteCapacity = async (req, res) => {
  const { id } = req.params;

  try {
    const capacity = await Capacity.findById(id);

    if (!capacity) {
      return res.status(404).json({ error: 'Capacity entry not found' });
    }

    // ✅ Only the owner or admin can delete
    if (req.user.role !== 'admin' && capacity.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this entry' });
    }

    await capacity.deleteOne();

    res.json({ message: 'Capacity entry deleted successfully' });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
