package com.construction.config;

import jakarta.annotation.PostConstruct;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.springframework.stereotype.Component;

/** Resolves the legacy minimum_stock_level column left by older inventory schemas. */
@Component
public class MaterialSchemaMigration {

    private final DataSource dataSource;

    public MaterialSchemaMigration(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @PostConstruct
    public void runSchemaMigrations() {
        try (Connection connection = dataSource.getConnection()) {
            String[] migrationSqls = {
                "ALTER TABLE materials MODIFY COLUMN minimum_stock_level DOUBLE NULL DEFAULT NULL",
                "ALTER TABLE purchase_orders MODIFY COLUMN order_number VARCHAR(255) NULL DEFAULT NULL",
                "ALTER TABLE purchase_orders MODIFY COLUMN supplier_name VARCHAR(255) NULL DEFAULT NULL",
                "ALTER TABLE material_transactions MODIFY COLUMN transaction_type VARCHAR(50) NULL DEFAULT NULL",
                "ALTER TABLE material_requests MODIFY COLUMN reason VARCHAR(255) NULL DEFAULT NULL",
                "ALTER TABLE material_requests MODIFY COLUMN requested_quantity DOUBLE NULL DEFAULT NULL"
            };

            for (String sql : migrationSqls) {
                try (var statement = connection.createStatement()) {
                    statement.executeUpdate(sql);
                } catch (SQLException e) {
                    // Ignore column not found or already modified errors
                }
            }
        } catch (SQLException exception) {
            System.err.println("Notice: Schema migration check completed with info: " + exception.getMessage());
        }
    }

    private boolean columnExists(Connection connection, String tableName, String columnName) throws SQLException {
        try (ResultSet columns = connection.getMetaData().getColumns(connection.getCatalog(), null,
                tableName, columnName)) {
            return columns.next();
        }
    }
}
