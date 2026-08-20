"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-jwt-secret-key-12345";

const db = require("../models");
const AuthService = require("../services/auth.services");

describe("CUSTOMER LOGIN -> REGISTER NAVIGATION & AUTH REGRESSION TEST", () => {
  let existingUser;
  const existingEmail = "existing.customer@mehndigo.in";
  const unregisteredEmail = "samanyadav2412@gmail.com";

  before(async () => {
    await db.sequelize.sync({ force: true });

    existingUser = await db.User.create({
      name: "Existing Verified Customer",
      email: existingEmail,
      phone: "9876543210",
      phone_number: "9876543210",
      role: "CUSTOMER",
      is_verified: true
    });
  });

  // A. Existing user login
  it("A. Existing user login -> Generates login OTP and verifies session", async () => {
    const sendRes = await AuthService.sendOtp({ email: existingEmail, role: "CUSTOMER" });
    assert.equal(sendRes.exists, true);
    assert.equal(sendRes.email, existingEmail);
    assert.ok(sendRes.otp);

    const verifyRes = await AuthService.verifyOtp({ email: existingEmail, otp: sendRes.otp });
    assert.ok(verifyRes.token);
    assert.ok(verifyRes.user);
    assert.equal(verifyRes.user.email, existingEmail);
  });

  // B & C. Unregistered email login & 404 / exists:false handling
  it("B & C. Unregistered email login -> returns exists: false, triggering registration navigation", async () => {
    const sendRes = await AuthService.sendOtp({ email: unregisteredEmail, role: "CUSTOMER" });
    assert.equal(sendRes.exists, false, "Unregistered user flagged as non-existent");
    assert.equal(sendRes.email, unregisteredEmail);
    assert.ok(sendRes.otp);
  });

  // D & E. Registration flow & email parameter propagation
  it("D & E. Customer Registration flow -> Pre-filled email, OTP dispatch, Account Creation", async () => {
    const regPayload = {
      name: "Saman Yadav",
      email: unregisteredEmail,
      phone: "9811122233",
      role: "CUSTOMER"
    };

    const regSendRes = await AuthService.registerSendOtp(regPayload);
    assert.equal(regSendRes.email, unregisteredEmail);
    assert.equal(regSendRes.phone, "9811122233");
    assert.ok(regSendRes.otp);

    const regVerifyRes = await AuthService.registerVerifyOtp({
      email: unregisteredEmail,
      phone: "9811122233",
      otp: regSendRes.otp
    });

    assert.ok(regVerifyRes.token);
    assert.ok(regVerifyRes.user);
    assert.equal(regVerifyRes.user.email, unregisteredEmail);
    assert.equal(regVerifyRes.user.name, "Saman Yadav");

    const createdUser = await db.User.findOne({ where: { email: unregisteredEmail } });
    assert.ok(createdUser);
    assert.equal(createdUser.is_verified, true);
  });

  // F. Duplicate email registration rejection
  it("F. Duplicate email registration prevention -> Rejects attempt to re-register verified email", async () => {
    await assert.rejects(
      async () => {
        await AuthService.registerSendOtp({
          name: "Duplicate Saman",
          email: unregisteredEmail,
          phone: "9899988877",
          role: "CUSTOMER"
        });
      },
      (err) => {
        return err.statusCode === 400 && err.message.includes("already registered");
      }
    );
  });

  // G. Mobile Navigation Architecture Inspection & Canonical Route Verification
  it("G. Navigation Tree Verification -> RootNavigator declares 'Register' and 'RoleSelection' in !isAuthenticated stack", () => {
    const rootNavPath = path.resolve(__dirname, "../../mobile/src/navigation/RootNavigator.js");
    const rootNavContent = fs.readFileSync(rootNavPath, "utf8");

    // Verify imports
    assert.ok(rootNavContent.includes("import RegisterScreen from \"../screens/Auth/RegisterScreen\";"), "RegisterScreen must be imported in RootNavigator");
    assert.ok(rootNavContent.includes("import RoleSelectionScreen from \"../screens/Auth/RoleSelectionScreen\";"), "RoleSelectionScreen must be imported in RootNavigator");

    // Verify Stack.Screen registration
    assert.ok(rootNavContent.includes('<Stack.Screen name="Register" component={RegisterScreen} />'), "Stack.Screen 'Register' must be registered in RootNavigator");
    assert.ok(rootNavContent.includes('<Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />'), "Stack.Screen 'RoleSelection' must be registered in RootNavigator");
    assert.ok(rootNavContent.includes('<Stack.Screen name="Login" component={LoginScreen} />'), "Stack.Screen 'Login' must be registered in RootNavigator");
    assert.ok(rootNavContent.includes('<Stack.Screen name="Otp" component={OtpScreen} />'), "Stack.Screen 'Otp' must be registered in RootNavigator");
  });

  // H. Verify LoginScreen navigates to canonical 'Register' with email parameter
  it("H. LoginScreen -> Navigates to canonical 'Register' route with email parameter", () => {
    const loginScreenPath = path.resolve(__dirname, "../../mobile/src/screens/Auth/LoginScreen.js");
    const loginScreenContent = fs.readFileSync(loginScreenPath, "utf8");

    assert.ok(
      loginScreenContent.includes('navigation.navigate("Register", { email: trimmedEmail });'),
      "LoginScreen must pass email param to Register route on 404/not-found"
    );
  });

  // I. Verify RegisterScreen consumes email parameter and supports navigation back to Login
  it("I. RegisterScreen -> Consumes route.params.email and maintains back navigation to Login", () => {
    const regScreenPath = path.resolve(__dirname, "../../mobile/src/screens/Auth/RegisterScreen.js");
    const regScreenContent = fs.readFileSync(regScreenPath, "utf8");

    assert.ok(regScreenContent.includes("const { email: initialEmail } = route.params || {};"), "RegisterScreen extracts email from route.params");
    assert.ok(regScreenContent.includes('navigation.navigate("Login", { email: trimmedEmail });') || regScreenContent.includes('navigation.navigate("Login")'), "RegisterScreen provides navigation back to Login");
  });

  // J. Exactly one canonical Customer registration screen in mobile codebase
  it("J. Exactly ONE canonical Customer registration screen exists in mobile codebase", () => {
    const authDir = path.resolve(__dirname, "../../mobile/src/screens/Auth");
    const files = fs.readdirSync(authDir);
    const regFiles = files.filter(f => f.toLowerCase().includes("register") || f.toLowerCase().includes("signup"));
    
    assert.equal(regFiles.length, 1, "Only one registration screen file must exist in src/screens/Auth");
    assert.equal(regFiles[0], "RegisterScreen.js");
  });
});
