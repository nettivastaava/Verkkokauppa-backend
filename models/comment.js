const mongoose = require('mongoose')

const schema = new mongoose.Schema({
    user: {    
        type: String,    
        required: true,  
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,    
        required: true,
        ref: 'Product'
    },
    content: {
        type: String,
        required: true,
        minlength: 1
    },
    grade: {
        type: Number,
        min: 1,
        max: 5
    }
})

module.exports = mongoose.model('Comment', schema)