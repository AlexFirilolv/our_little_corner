output "database_address" {
	value = aws_db_instance.postgres.address
}

output "database_endpoint" {
	value = aws_db_instance.postgres.endpoint
}

output "database_name" {
	value = aws_db_instance.postgres.db_name
}

output "database_username" {
	value = aws_db_instance.postgres.username
}