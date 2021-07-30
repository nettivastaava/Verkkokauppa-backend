const { ApolloServer, UserInputError, gql } = require('apollo-server-express')
const { v1: uuid } = require('uuid')
const path = require('path')
const mongoose = require('mongoose')
const express = require('express')
const expressGraphQL = require('express-graphql');
const cors = require('cors')
const Product = require('./models/product')
const { typeDefs } = require('./models/typeDefs')
const User = require('./models/user')
const Comment = require('./models/comment')
const config = require('./utils/config')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const app = express()

app.use(express.static('build'))
app.use(cors())

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'build','index.html'));
})
console.log('connecting to', config.MONGODB_URI)

const JWT_SECRET = 'NEED_HERE_A_SECRET_KEY'

mongoose.connect(config.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  })

const resolvers = {
  Query: {
    productCount: () => Product.collection.countDocuments(),
    allProducts: async (root, args) => {
      const products = await Product.find({}).populate('comments')     

      /* const products = await Product.find({}).populate({
        path : 'comments',
        populate : { path : 'user' }
      }).exec(function (err, res) {
        console.log('error')
      }) */

      if (!args.category) {
        return products.sort((p1, p2) => p2.units_sold - p1.units_sold)
      } else {
        return products.filter(product => product.categories.includes(args.category))          
      }
    },
    me: async (root, args, context) => {
      return await context.currentUser
    },
    allCategories: async () => {
      const products = await Product.find({})
      const categories = products.map(product => product.categories)
      .reduce((previous, current) => previous.concat(current))

      const uniqueCategories = [...new Set(categories)];
      return uniqueCategories
    },
    findProduct: async (root, args) => {
      const product = await Product.findOne({ name: args.name }).populate('comments')
      return product
    },
    allComments: async (root, args) => {
      const comments = await Comment.find({})
      console.log(comments)
        
      return comments
    },
    totalPrice: async (root, args, context) => {
      const shoppingCart = await context.currentUser.cart
      var total = 0

      for (var i = 0; i < shoppingCart.length; i++) {
        total += (shoppingCart[i].amount * shoppingCart[i].price)
      }

      return total
    }
  },
  Mutation: {
    addProduct: async (root, args) => {
      const product = new Product({ ...args })

      try {
        await product.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }

      return product
    },
    increaseQuantity: async (root, args) => {
      const product = await Product.findOne({ name: args.name })

      if (args.quantity < 1) {
        throw new UserInputError("Quantity can only be incremented by a positive integer", {
          invalidArgs: args,
        })
      }

      product.quantity = product.quantity + args.quantity

      try {
        await product.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }

      return product
    },
    decreaseQuantity: async (root, args) => {
      const product = await Product.findOne({ name: args.name })

      if (args.quantity < 1) {
        throw new UserInputError("Quantity can only be decremented by a positive integer", {
          invalidArgs: args,
        })
      }

      if (args.quantity > product.quantity) {
        throw new UserInputError("Given value exceeds the quantity of the product", {
          invalidArgs: args,
        })
      }

      product.quantity = product.quantity - args.quantity
      product.units_sold = product.units_sold + args.quantity

      try {
        await product.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }

      return product
    },
    createUser: async (root, args) => {
      if (args.password !== args.passwordConf) {
        throw new UserInputError("Make sure the password matches the confirmation", {
          invalidArgs: args,
        })
      }

      const saltRounds = 10
      const passwordHash = await bcrypt.hash(args.password, saltRounds)
   
      const user = new User({
        username: args.username,
        passwordHash,
        cart: []
      })

      return user.save()
        .catch(error => {
          throw new UserInputError(error.message, {
            invalidArgs: args,
          })
        })
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })
      const passwordCorrect = user === null
        ? false
        : await bcrypt.compare(args.password, user.passwordHash)

      if (!(user && passwordCorrect)) {
        throw new UserInputError("Invalid credentials", {
          invalidArgs: args,
        })
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      }
  
      return { value: jwt.sign(userForToken, JWT_SECRET) }
    },
    addComment: async (root, args, context) => {
      const comment = new Comment({ ...args })
      const product = await Product.findById(args.product).populate('comments')

      try {
        await comment.save()
        product.comments = product.comments.concat(comment) 
        
        const gradeSum = await product.comments.reduce((s, v) => s + v.grade, 0)
        product.average_grade = await Math.round(gradeSum/product.comments.length*10)/10
        
        await product.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }

      return comment
    },
    addToCart: async (root, args, context) => {
      const user = await context.currentUser
      const product = await Product.findOne({name: args.productName})

      const productToCart = {
        productName: args.productName,
        amount: 1,
        price: args.price
      }

      var found = false;

      for(var i = 0; i < user.cart.length; i++) {
        if (user.cart[i].productName === productToCart.productName) {
          found = true
          if (user.cart[i].amount < product.quantity) {
            let updatedCart = []
            for (var j = 0; j < user.cart.length; j++) {
              if (i === j) {
                const updatedProductToCart = {
                  ...user.cart[i],
                  amount: user.cart[i].amount+=1
                }
                updatedCart = updatedCart.concat(updatedProductToCart)
              } else {
                updatedCart = updatedCart.concat(user.cart[j])
              }
            }
            const newUser = {...user, cart: updatedCart}
            try {
              const updatedUser = await User.findByIdAndUpdate(user.id, newUser, {new: true})
              return updatedUser
            } catch (error) {
              throw new UserInputError(error.message, {
                invalidArgs: args,
              })
            }

          }
        }
      }

      if (!found && product.quantity > 0) {
        user.cart = user.cart.concat(productToCart)
      } 

      try {
        await user.save()
        return user
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
    },
    removeFromCart: async (root, args, context) => {
      const user = await context.currentUser

      var remove = false

      const copy = [...user.cart]
      for (var i = 0; i < copy.length; i++) {
        if (user.cart[i].productName === args.productName) {
          if (user.cart[i].amount > 1) {
            copy[i].amount-=1
            break
          } else {
            remove = true
            const removeFromUser = await User.findByIdAndUpdate(user.id, { $pull: { "cart": { productName: args.productName } } }, {new: true})
            return removeFromUser
          }
        }
      }

      const newUser = {...user, cart: copy}
      if (!remove) {
        try {
          const updatedUser = await User.findByIdAndUpdate(user.id, newUser, {new: true})
          return updatedUser
        } catch (error) {
          throw new UserInputError(error.message, {
            invalidArgs: args,
          })
        }
      }
    },
    checkout: async (root, args, context) => {
      const user = await context.currentUser

      for (var i = 0; i < user.cart.length; i++) {
        const product = await Product.findOne({ name: user.cart[i].productName })
        if (product.quantity >= user.cart[i].amount) {
          product.units_sold = product.units_sold + user.cart[i].amount
          product.quantity = product.quantity - user.cart[i].amount

          const removeFromUser = await User.findByIdAndUpdate(user.id, { $pull: { "cart": { productName: user.cart[i].productName } } }, {new: true})
          try {
            await product.save()
          } catch (error) {
            throw new UserInputError(error.message, {
              invalidArgs: args,
            })
          }
        }
      }
    },
    removeComment: async (root, args, context) => {
      const user = await context.currentUser
      const product = await Product.findById(args.productId).populate('comments')

      for (var i = 0; i < product.comments.length; i++) {
        if (product.comments[i].user === user.username) {
        const updatedProduct = await Product.findByIdAndUpdate(product.id, { $pull: { "comments": { id: product.comments[i].id } } }, {new: true})  
        await Comment.findByIdAndRemove(product.comments[i].id)

        return updatedProduct
        } 
      }
    }
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null    
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(
        auth.substring(7), JWT_SECRET
      )      
      const currentUser = await User
        .findById(decodedToken.id).populate('product')
        return { currentUser }
    }
  }
})

server.applyMiddleware({ app })

const PORT = process.env.PORT || 4000

app.listen({ port: PORT }, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
)
