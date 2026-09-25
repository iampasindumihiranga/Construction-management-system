package com.construction.config;

import jakarta.annotation.PostConstruct;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Makes older MySQL installations compatible with all current management roles.
 * Earlier versions created user_accounts.role as a restrictive ENUM, which cannot
 * accept newly introduced roles such as EMPLOYEE or EMPLOYEE_MANAGER.
 */
@Component
public class UserAccountRoleSchemaMigration {

    private static final Logger logger = LoggerFactory.getLogger(UserAccountRoleSchemaMigration.class);
    private final DataSource dataSource;

    public UserAccountRoleSchemaMigration(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @PostConstruct
    public void migrateRoleColumn() {
        try (Connection connection = dataSource.getConnection()) {
            if (!userAccountsTableExists(connection)) {
                return;
            }

            try (ResultSet columns = connection.getMetaData().getColumns(connection.getCatalog(), null,
                    "user_accounts", "role")) {
                if (columns.next() && columns.getString("TYPE_NAME").toLowerCase().startsWith("enum")) {
                    try (var statement = connection.createStatement()) {
                        statement.executeUpdate("ALTER TABLE user_accounts MODIFY COLUMN role VARCHAR(32) NOT NULL");
                    }
                    logger.info("Migrated user_accounts.role from ENUM to VARCHAR(32)");
                }
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Could not verify the user account role schema", exception);
        }
    }

    private boolean userAccountsTableExists(Connection connection) throws SQLException {
        DatabaseMetaData metadata = connection.getMetaData();
        try (ResultSet tables = metadata.getTables(connection.getCatalog(), null, "user_accounts", new String[]{"TABLE"})) {
            return tables.next();
        }
    }
}
