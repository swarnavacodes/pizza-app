#!/bin/bash
set -euo pipefail

# Seed the menu table with sample products (idempotent).
# Runs in the Floci compat image where the `aws` CLI is preconfigured for http://localhost:4566.
# Also runnable manually with the aws-floci profile.

MENU_TABLE="pizza-dev-menu"

aws dynamodb put-item --table-name "$MENU_TABLE" --item '{
  "productId": {"S": "prod_margherita"},
  "name": {"S": "Margherita"},
  "description": {"S": "San Marzano tomato, fresh mozzarella, basil"},
  "category": {"S": "PIZZA"},
  "basePrice": {"N": "9.99"},
  "availableSizes": {"L": [{"S": "SMALL"}, {"S": "MEDIUM"}, {"S": "LARGE"}]},
  "availableCrusts": {"L": [{"S": "THIN"}, {"S": "CLASSIC"}]},
  "toppings": {"L": [{"S": "extra mozzarella"}, {"S": "basil"}]}
}' || echo "seed margherita: already exists or failed"

aws dynamodb put-item --table-name "$MENU_TABLE" --item '{
  "productId": {"S": "prod_pepperoni"},
  "name": {"S": "Pepperoni"},
  "description": {"S": "Classic pepperoni, mozzarella, tomato sauce"},
  "category": {"S": "PIZZA"},
  "basePrice": {"N": "12.49"},
  "availableSizes": {"L": [{"S": "SMALL"}, {"S": "MEDIUM"}, {"S": "LARGE"}]},
  "availableCrusts": {"L": [{"S": "THIN"}, {"S": "CLASSIC"}, {"S": "STUFFED"}]},
  "toppings": {"L": [{"S": "extra pepperoni"}, {"S": "jalapenos"}]}
}' || echo "seed pepperoni: already exists or failed"

aws dynamodb put-item --table-name "$MENU_TABLE" --item '{
  "productId": {"S": "prod_coke"},
  "name": {"S": "Coca-Cola"},
  "description": {"S": "330ml can, ice cold"},
  "category": {"S": "BEVERAGES"},
  "basePrice": {"N": "2.50"},
  "availableSizes": {"L": [{"S": "REGULAR"}]},
  "availableCrusts": {"L": []},
  "toppings": {"L": []}
}' || echo "seed coke: already exists or failed"

echo "menu seeded"
