const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const schema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 3
    },
    passwordHash: {
      type: String,
      required: true,
    },
    cart: {
      type:Array,
      product: {
        type: String,
        required: true
      },
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      price: {
        type: Number,
        required: true,
        min: 0.05
      }
    }
})

schema.plugin(uniqueValidator)

schema.set('toJSON', {
    transform: (document, returnedObject) => {
      returnedObject.id = returnedObject._id.toString()
      delete returnedObject._id
      delete returnedObject.__v
      delete returnedObject.passwordHash
    }
})

module.exports = mongoose.model('User', schema)