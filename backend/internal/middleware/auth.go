package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// AuthMiddleware handles JWT authentication
func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing authorization header",
			})
		}

		// Check if the header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid authorization header format",
			})
		}

		// Extract the token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// Parse and validate the token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Verify signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.NewError(fiber.StatusUnauthorized, "Invalid token signing method")
			}

			// Return the secret key
			return []byte("your-secret-key"), nil // TODO: Get from environment variable
		})

		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token",
			})
		}

		// Check if the token is valid
		if !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token",
			})
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token claims",
			})
		}

		// Add user information to context
		c.Locals("user_id", claims["user_id"])
		c.Locals("email", claims["email"])

		return c.Next()
	}
}

// OptionalAuthMiddleware handles optional JWT authentication
func OptionalAuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next()
		}

		// Check if the header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Next()
		}

		// Extract the token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// Parse and validate the token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Verify signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.NewError(fiber.StatusUnauthorized, "Invalid token signing method")
			}

			// Return the secret key
			return []byte("your-secret-key"), nil // TODO: Get from environment variable
		})

		if err != nil || !token.Valid {
			return c.Next()
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Next()
		}

		// Add user information to context
		c.Locals("user_id", claims["user_id"])
		c.Locals("email", claims["email"])

		return c.Next()
	}
}

// RequireAuth checks if the user is authenticated
func RequireAuth(c *fiber.Ctx) error {
	if c.Locals("user_id") == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authentication required",
		})
	}
	return c.Next()
} 