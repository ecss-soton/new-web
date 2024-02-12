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

