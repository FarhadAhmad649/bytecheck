import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(
      `MongoDB Atlas Connected Successfully! Host: ${conn.connection.host}`,
    );
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Exit process with failure if the database doesn't connect
    process.exit(1);
  }
};

export default connectDB;
