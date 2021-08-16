const { gql } = require('apollo-server')

const typeDefs = gql`
  type Product {
    name: String!
    price: Float!
    quantity: Int!
    categories: [String!]!
    id: ID!
    description: String 
    comments: [Comment]!
    units_sold: Int!
    average_grade: Float
  }

  type Query {
    productCount: Int!
    allProducts(category: String): [Product]!
    allCategories: [String]!
    me: User
    findProduct(name: String): Product
    allComments(product: String): [Comment]!
    totalPrice: Float!
  }

  type User {
    username: String!
    password: String!
    id: ID!
    role: String!
    cart: [ProductInCart]!
  }

  type ProductInCart {
    productName: String!
    price: Float!
    amount: Int!
  }

  type Comment {
    user: String!
    product: String!
    content: String!
    grade: Int!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Mutation {
    addProduct(
      name: String!
      price: Float!
      quantity: Int!
      categories: [String!]!
      description: String
    ): Product
    increaseQuantity(    
      name: String!    
      quantity: Int! 
    ): Product
    decreaseQuantity(
      name: String!
      quantity: Int!
    ): Product
    createUser(
      username: String!
      password: String!
      passwordConf: String!
      role: String
    ): User
    login(
      username: String!
      password: String!
    ): Token
    addComment(
      product: String!
      user: String!
      content: String!
      grade: Int!
    ): Comment
    addToCart(
      productName: String!
      price: Float!
    ): User
    removeFromCart(
      productName: String!
    ): User
    checkout: User
    removeComment(
      productId: String!
    ): Product
    changePassword(
      oldPassword: String!
      newPassword: String!
      confirmNew: String!
    ): User
  }
`

module.exports = { typeDefs }