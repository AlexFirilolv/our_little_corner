# 1. Create the OIDC Identity Provider for GitHub
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"] # Standard thumbprint for GitHub OIDC
}

# 2. Define the Trust Policy (the "AssumeRole" policy)
data "aws_iam_policy_document" "github_actions_trust_policy" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    # Condition to only allow your specific GitHub repo to assume this role
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:YourGitHubUsername/YourRepoName:*"] 
    }
  }
}

# 3. Create the IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions_role" {
  name               = "github-actions-role"
  assume_role_policy = data.aws_iam_policy_document.github_actions_trust_policy.json
}

# 4. Define the permissions policy
data "aws_iam_policy_document" "github_actions_permissions_policy" {
  statement {
    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage"
    ]
    resources = [aws_ecr_repository.app.arn]
  }
  statement {
    actions   = ["ssm:SendCommand"]
    resources = [
      aws_instance.app_server.arn,
      "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:document/AWS-RunShellScript"
    ]
  }

  statement {
  actions = [
    "ec2:CreateLaunchTemplateVersion",
    "ec2:DescribeLaunchTemplates",
    "autoscaling:StartInstanceRefresh"
  ]
  resources = ["*"] # Scoped down for production
 }
}

# 5. Create the policy and attach it to the role
resource "aws_iam_policy" "github_actions_policy" {
  name   = "GitHubActionsPermissions"
  policy = data.aws_iam_policy_document.github_actions_permissions_policy.json
}

resource "aws_iam_role_policy_attachment" "github_actions_attach" {
  role       = aws_iam_role.github_actions_role.name
  policy_arn = aws_iam_policy.github_actions_policy.arn
}
