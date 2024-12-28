package logger

import (
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Initialize sets up the global logger configuration
func Initialize() {
	// Set up pretty console logging for development
	if os.Getenv("APP_ENV") != "production" {
		log.Logger = log.Output(zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
		})
	} else {
		// Production setup - JSON logging
		zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
		log.Logger = zerolog.New(os.Stdout).With().Timestamp().Logger()
	}

	// Set global log level based on environment
	level := os.Getenv("LOG_LEVEL")
	switch level {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		if os.Getenv("APP_ENV") == "production" {
			zerolog.SetGlobalLevel(zerolog.InfoLevel)
		} else {
			zerolog.SetGlobalLevel(zerolog.DebugLevel)
		}
	}
}

// Fields represents a map of log fields
type Fields map[string]interface{}

// Debug logs a debug message with optional fields
func Debug(message string, fields ...Fields) {
	event := log.Debug()
	if len(fields) > 0 {
		event = addFields(event, fields[0])
	}
	event.Msg(message)
}

// Info logs an info message with optional fields
func Info(message string, fields ...Fields) {
	event := log.Info()
	if len(fields) > 0 {
		event = addFields(event, fields[0])
	}
	event.Msg(message)
}

// Warn logs a warning message with optional fields
func Warn(message string, fields ...Fields) {
	event := log.Warn()
	if len(fields) > 0 {
		event = addFields(event, fields[0])
	}
	event.Msg(message)
}

// Error logs an error message with optional fields
func Error(message string, err error, fields ...Fields) {
	event := log.Error()
	if err != nil {
		event = event.Err(err)
	}
	if len(fields) > 0 {
		event = addFields(event, fields[0])
	}
	event.Msg(message)
}

// Fatal logs a fatal message with optional fields and exits
func Fatal(message string, err error, fields ...Fields) {
	event := log.Fatal()
	if err != nil {
		event = event.Err(err)
	}
	if len(fields) > 0 {
		event = addFields(event, fields[0])
	}
	event.Msg(message)
}

// addFields adds fields to a log event
func addFields(event *zerolog.Event, fields Fields) *zerolog.Event {
	for k, v := range fields {
		event = event.Interface(k, v)
	}
	return event
} 