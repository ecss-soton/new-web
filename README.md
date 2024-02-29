# University of Southampton Electronics and Computer Science Society website

This website is used as the primary digital interface between the ECS Society and it's members. We hope that this
website allows our members to show off what they are all capable of

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/download/)
- [Rust](https://www.rust-lang.org/tools/install)
- [MongoDB](https://www.mongodb.com/try/download/community)

### Environment Variables

To run this project, copy the `.env.example` file to `.env` and fill in the environment variables

### Seeding the Database

When running the website for the first time, you will need to seed the database with some initial data. This can be done

```bash
mongorestore --uri="mongodb://127.0.0.1/" --db=ecss-website-cms data/dump/ecss-website-cms
```

Note after development you may want to save the database for others to use. This can be done using the following command

```bash
mongodump --uri="mongodb://127.0.0.1/" --db=ecss-website-cms --out=[file path to ./data]
```

### Run Locally

Clone the project

```bash
git clone https://github.com/ecss-soton/new-web.git
```

Go to the project directory

```bash
cd new-web
```

Install dependencies

```bash
yarn install
```

The election backend requires the [stv-rs](https://crates.io/crates/stv-rs) command line tool. It can be installed using
the following command

```bash
cargo install stv-rs
```

Start the server

```bash
yarn run dev
```

