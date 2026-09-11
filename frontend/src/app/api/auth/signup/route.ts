import { NextRequest, NextResponse } from "next/server";
import { registerUserInS3 } from "@/lib/aws";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    console.log(`[API /auth/signup] Registering user in S3: ${email}`);
    const user = await registerUserInS3(email, password, name);

    // 12-hour session
    const expiresAt = Date.now() + 12 * 60 * 60 * 1000;

    return NextResponse.json(
      {
        message: "Account created successfully in S3",
        user,
        expiresAt,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Sign up error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create account." },
      { status: 400 }
    );
  }
}
