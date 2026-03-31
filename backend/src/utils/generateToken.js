import jwt from "jsonwebtoken";

export const generateToken=(userId , res) =>{
  const secret = process.env.JWT_SECRET;
  const payload = {id:userId}

  const expiresIn = process.env.JWT_EXPIRES_IN?.trim() || "7d";
  if (!secret?.trim()) {
    throw new Error(
      "JWT_SECRET is missing. Add it to backend/.env (e.g. JWT_SECRET=your_long_random_string)"
    );
  }
  const token = jwt.sign(payload, secret, { expiresIn });

  res.cookie("jwt" , token , {
    httpOnly:true,
    secure : process.env.NODE_ENV ==="production",
    sameSite : "strict",
    maxAge:1000*60*60*24*7
  })
  return token;
}
