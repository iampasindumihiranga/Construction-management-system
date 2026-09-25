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
    public void makeLegacyStockColumnOptional() {
        try (Connection connection = dataSource.getConnection()) {
            if (!columnExists(connection, "minimum_stock_level")) {
                return;
            }
            try (var statement = connection.createStatement()) {
                statement.executeUpdate("ALTER TABLE materials MODIFY COLUMN minimum_stock_level DOUBLE NULL");
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Could not migrate the inventory stock-level schema", exception);
        }
    }

    private boolean columnExists(Connection connection, String columnName) throws SQLException {
        try (ResultSet columns = connection.getMetaData().getColumns(connection.getCatalog(), null,
                "materials", columnName)) {
            return columns.next();
        }
    }
}
