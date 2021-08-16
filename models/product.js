const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: 4
  },
  price: {
    type: Number,
    required: true,
    min: 0.05
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  categories: [
    { type: String, required: true }
  ],
  description: {
      type: String,
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment'
    }
  ],
  units_sold: {
    type: Number,
    required: true,
    min: 0
  },
  average_grade: {
    type: Number,
    min: 1,
    max: 5
  }
})

module.exports = mongoose.model('Product', schema)