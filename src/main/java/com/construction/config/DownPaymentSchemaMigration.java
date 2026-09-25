package com.construction.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Ensures table schema compatibility for DownPayment (valid_until, receipt, receipt_file_name, receipt_file_type)
 * and backfills 60-day validity for existing payments.
 */
@Component
public class DownPaymentSchemaMigration {

    private static final Logger log = LoggerFactory.getLogger(DownPaymentSchemaMigration.class);
    private final DataSource dataSource;

    public DownPaymentSchemaMigration(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @PostConstruct
    public void migrateDownPaymentsSchema() {
        try (Connection connection = dataSource.getConnection()) {
            if (!tableExists(connection, "down_payments")) {
                return;
            }

            try (Statement statement = connection.createStatement()) {
                if (!columnExists(connection, "down_payments", "valid_until")) {
                    log.info("Adding valid_until column to down_payments");
                    statement.executeUpdate("ALTER TABLE down_payments ADD COLUMN valid_until DATE NULL");
                }

                if (!columnExists(connection, "down_payments", "receipt")) {
                    log.info("Adding receipt column to down_payments");
                    statement.executeUpdate("ALTER TABLE down_payments ADD COLUMN receipt LONGTEXT NULL");
                }

                if (!columnExists(connection, "down_payments", "receipt_file_name")) {
                    log.info("Adding receipt_file_name column to down_payments");
                    statement.executeUpdate("ALTER TABLE down_payments ADD COLUMN receipt_file_name VARCHAR(255) NULL");
                }

                if (!columnExists(connection, "down_payments", "receipt_file_type")) {
                    log.info("Adding receipt_file_type column to down_payments");
                    statement.executeUpdate("ALTER TABLE down_payments ADD COLUMN receipt_file_type VARCHAR(100) NULL");
                }

                // Backfill valid_until as 60 days from payment_date if null
                statement.executeUpdate(
                        "UPDATE down_payments " +
                        "SET valid_until = DATE_ADD(payment_date, INTERVAL 60 DAY) " +
                        "WHERE valid_until IS NULL AND payment_date IS NOT NULL"
                );

                // Synchronize status for any legacy rows
                statement.executeUpdate(
                        "UPDATE down_payments " +
                        "SET status = CASE " +
                        "  WHEN valid_until < CURDATE() THEN 'Expired' " +
                        "  WHEN valid_until <= DATE_ADD(CURDATE(), INTERVAL 15 DAY) THEN 'Expiring Soon' " +
                        "  ELSE 'Valid' " +
                        "END " +
                        "WHERE valid_until IS NOT NULL AND status IN ('PENDING', 'CONFIRMED', 'FAILED')"
                );
            }
        } catch (SQLException e) {
            log.warn("DownPayment schema migration notice: {}", e.getMessage());
        }
    }

    private boolean tableExists(Connection connection, String tableName) throws SQLException {
        try (ResultSet rs = connection.getMetaData().getTables(connection.getCatalog(), null, tableName, new String[]{"TABLE"})) {
            return rs.next();
        }
    }

    private boolean columnExists(Connection connection, String tableName, String columnName) throws SQLException {
        try (ResultSet columns = connection.getMetaData().getColumns(connection.getCatalog(), null, tableName, columnName)) {
            return columns.next();
        }
    }
}
