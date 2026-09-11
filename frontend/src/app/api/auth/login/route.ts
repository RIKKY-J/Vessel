import { NextRequest, NextResponse } from "next/server";
import { authenticateUserInS3 } from "@/lib/aws";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    console.log(`[API /auth/login] Authenticating user from S3: ${email}`);
    const user = await authenticateUserInS3(email, password);

    // 12-hour session
    const expiresAt = Date.now() + 12 * 60 * 60 * 1000;

    return NextResponse.json(
      {
        message: "Login successful",
        user,
        expiresAt,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error?.message || "Invalid credentials." },
      { status: 401 }
    );
  }
}
