DROP TABLE IF EXISTS signatures;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_profiles;

CREATE TABLE signatures(
  id SERIAL PRIMARY KEY,
  signature TEXT not null,
  user_id INTEGER not null REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users(
  id SERIAL PRIMARY KEY,
  first VARCHAR(300) not null,
  last VARCHAR(300) not null,
  email VARCHAR(300) not null UNIQUE,
  password VARCHAR(300) not null,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles(
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  age VARCHAR(300),
  city VARCHAR(300),
  url VARCHAR(300)
)
