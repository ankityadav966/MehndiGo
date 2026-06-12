# intellix

run the following migration commands one after another:

npx sequelize-cli db:migrate:undo --name=20240910103657-create-institute
npx sequelize-cli db:migrate --name=20240916123131-create-category
<!-- npx sequelize-cli db:migrate --name=20240803064111-create-admin.js -->
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all

to seed only one file
npx sequelize db:seed --seed 20241202-create-btech-specifications.js

to create model:
npx sequelize-cli model:generate --name User --attributes firstName:string

to create migrations:
npx sequelize-cli migration:generate --name migration-skeleton

to create seeder:
npx sequelize-cli seed:generate --name create-generic-course


#things to note 

while creating  a db:
format should be camel case e.g = userDetails

fields of databse should be with underscore 
e.g. user_id

file should be name 
e.g. employee.controller.js


<!-- git  -->
git add .
git commit -m "changes"
git push origin <branch name>

<!-- code pull -->
git pull origin dev



ERROR: Please install pg package manually   =>   pnpm add pg pg-hstore


