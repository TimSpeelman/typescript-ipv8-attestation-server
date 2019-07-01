const fs = require('fs');

module.exports = {
  development: {
    username: 'postgres',
    password: 'postgres',
    database: 'housecamp',
    host: '127.0.0.1',
    dialect: 'postgres'
  },
//   test: {
//     username: 'database_test',
//     password: null,
//     database: 'database_test',
//     host: '127.0.0.1',
//     dialect: 'mysql'
//   },
//   production: {
//     username: process.env.DB_USERNAME,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     host: process.env.DB_HOSTNAME,
//     dialect: 'mysql',
//     dialectOptions: {
//       ssl: {
//         ca: fs.readFileSync(__dirname + '/mysql-ca-master.crt')
//       }
//     }
//   }
};