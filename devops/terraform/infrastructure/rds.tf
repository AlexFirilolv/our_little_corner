resource "aws_db_instance" "postgres" {
  allocated_storage    = 20
  db_name              = "our_little_corner"
  engine               = "postgres"
  instance_class       = "db.t3.micro"
  username             = var.aws.db.username
  password             = var.aws.db.password
  publicly_accessible  = true
  skip_final_snapshot  = true
  db_subnet_group_name = aws_db_subnet_group.postgres_subnet_group.name
  vpc_security_group_ids = [aws_security_group.allow_postgres.id]
}

resource "aws_security_group" "allow_postgres" {
  name        = "allow_postgres"
  description = "Allows PostgreSQL traffic"
  vpc_id      = aws_vpc.vpc.id
}

resource "aws_vpc_security_group_ingress_rule" "allow_postgres_ipv4" {
  from_port         = 5432
  ip_protocol       = "tcp"
  to_port           = 5432
  security_group_id = aws_security_group.allow_postgres.id
  cidr_ipv4         = "85.0.0.0/8"
}

resource "aws_db_subnet_group" "postgres_subnet_group" {
  name       = "postgres_subnet_group"
  subnet_ids = [aws_subnet.subnet1.id, aws_subnet.subnet2.id]
}
