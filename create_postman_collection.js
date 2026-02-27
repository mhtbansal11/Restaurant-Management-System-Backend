const fs = require('fs');

const collection = {
  info: {
    name: "Restaurant Management System API",
    description: "API collection for the Restaurant Management System Backend",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [
    {
      name: "Auth",
      item: [
        {
          name: "Register",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/auth/register",
              host: ["{{baseUrl}}"],
              path: ["api", "auth", "register"]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Admin User",
                email: "admin@example.com",
                password: "password123",
                restaurantName: "My Fancy Restaurant"
              }, null, 2)
            }
          }
        },
        {
          name: "Login",
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "var jsonData = pm.response.json();",
                  "pm.environment.set('token', jsonData.token);"
                ],
                type: "text/javascript"
              }
            }
          ],
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/auth/login",
              host: ["{{baseUrl}}"],
              path: ["api", "auth", "login"]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "admin@example.com",
                password: "password123"
              }, null, 2)
            }
          }
        },
        {
          name: "Get Current User",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/auth/me",
              host: ["{{baseUrl}}"],
              path: ["api", "auth", "me"]
            }
          }
        }
      ]
    },
    {
      name: "Menu",
      item: [
        {
          name: "Get All Menu Items",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/menu",
              host: ["{{baseUrl}}"],
              path: ["api", "menu"]
            }
          }
        },
        {
          name: "Get Menu Item by ID",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/menu/:id",
              host: ["{{baseUrl}}"],
              path: ["api", "menu", ":id"],
              variable: [{ key: "id", value: "ITEM_ID_HERE" }]
            }
          }
        },
        {
          name: "Create Menu Item",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/menu",
              host: ["{{baseUrl}}"],
              path: ["api", "menu"]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Butter Chicken",
                description: "Classic mild chicken curry",
                price: 350,
                category: "Main Course",
                image: "http://example.com/image.jpg",
                isAvailable: true
              }, null, 2)
            }
          }
        },
        {
          name: "AI Extract Menu from Image",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/menu/ai-extract",
              host: ["{{baseUrl}}"],
              path: ["api", "menu", "ai-extract"]
            },
            body: {
              mode: "formdata",
              formdata: [
                { key: "image", type: "file", src: [] }
              ]
            }
          }
        },
        {
          name: "Update Menu Item",
          request: {
            method: "PUT",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/menu/:id",
              host: ["{{baseUrl}}"],
              path: ["api", "menu", ":id"],
              variable: [{ key: "id", value: "ITEM_ID_HERE" }]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                price: 380,
                isAvailable: false
              }, null, 2)
            }
          }
        },
        {
          name: "Delete Menu Item",
          request: {
            method: "DELETE",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/menu/:id",
              host: ["{{baseUrl}}"],
              path: ["api", "menu", ":id"],
              variable: [{ key: "id", value: "ITEM_ID_HERE" }]
            }
          }
        }
      ]
    },
    {
      name: "Seating",
      item: [
        {
          name: "Get Seating Layout",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/seating/layout",
              host: ["{{baseUrl}}"],
              path: ["api", "seating", "layout"]
            }
          }
        },
        {
          name: "Save Seating Layout",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/seating/layout",
              host: ["{{baseUrl}}"],
              path: ["api", "seating", "layout"]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                floors: [
                  {
                    id: "floor-1",
                    name: "Main Floor",
                    canvasWidth: 1200,
                    canvasHeight: 800,
                    tables: [
                      { id: "T1", type: "rect", x: 100, y: 100, width: 80, height: 80, capacity: 4, label: "Table 1" },
                      { id: "T2", type: "circle", x: 300, y: 100, radius: 40, capacity: 2, label: "Table 2" }
                    ]
                  }
                ]
              }, null, 2)
            }
          }
        },
        {
          name: "Get Tables Status",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/seating/tables",
              host: ["{{baseUrl}}"],
              path: ["api", "seating", "tables"]
            }
          }
        },
        {
          name: "Update Table Status",
          request: {
            method: "PUT",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/seating/tables/:tableId",
              host: ["{{baseUrl}}"],
              path: ["api", "seating", "tables", ":tableId"],
              variable: [{ key: "tableId", value: "T1" }]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                status: "occupied",
                customerCount: 3
              }, null, 2)
            }
          }
        }
      ]
    },
    {
      name: "Orders",
      item: [
        {
          name: "Get Order Stats",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/orders/stats",
              host: ["{{baseUrl}}"],
              path: ["api", "orders", "stats"]
            }
          }
        },
        {
          name: "Get All Orders",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/orders?status=pending",
              host: ["{{baseUrl}}"],
              path: ["api", "orders"],
              query: [{ key: "status", value: "pending" }]
            }
          }
        },
        {
          name: "Get Order by ID",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/orders/:id",
              host: ["{{baseUrl}}"],
              path: ["api", "orders", ":id"],
              variable: [{ key: "id", value: "ORDER_ID_HERE" }]
            }
          }
        },
        {
          name: "Create Order",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/orders",
              host: ["{{baseUrl}}"],
              path: ["api", "orders"]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                tableId: "T1",
                tableLabel: "Table 1",
                items: [
                  { menuItem: "MENU_ITEM_ID_HERE", quantity: 2, price: 350, name: "Butter Chicken" }
                ],
                customerName: "John Doe",
                customerPhone: "9876543210",
                orderType: "dine-in",
                subtotal: 700,
                taxRate: 5,
                taxAmount: 35,
                totalAmount: 735
              }, null, 2)
            }
          }
        },
        {
          name: "Update Order Status",
          request: {
            method: "PUT",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/orders/:id/status",
              host: ["{{baseUrl}}"],
              path: ["api", "orders", ":id", "status"],
              variable: [{ key: "id", value: "ORDER_ID_HERE" }]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                status: "completed",
                freeTable: true
              }, null, 2)
            }
          }
        }
      ]
    },
    {
      name: "AI Services",
      item: [
        {
          name: "Chat with AI",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/ai/chat",
              host: ["{{baseUrl}}"],
              path: ["api", "ai", "chat"]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                message: "Suggest a popular spicy dish",
                history: []
              }, null, 2)
            }
          }
        },
        {
          name: "Get Recommendations",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/ai/recommend",
              host: ["{{baseUrl}}"],
              path: ["api", "ai", "recommend"]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                cartItems: [
                  { name: "Burger", category: "Fast Food" }
                ]
              }, null, 2)
            }
          }
        },
        {
          name: "Get Forecast",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/ai/forecast?days=7",
              host: ["{{baseUrl}}"],
              path: ["api", "ai", "forecast"],
              query: [{ key: "days", value: "7" }]
            }
          }
        },
        {
          name: "Get Operational Insights",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/ai/operational-insights",
              host: ["{{baseUrl}}"],
              path: ["api", "ai", "operational-insights"]
            }
          }
        }
      ]
    },
    {
      name: "Inventory",
      item: [
        {
          name: "Get All Inventory Items",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/inventory",
              host: ["{{baseUrl}}"],
              path: ["api", "inventory"]
            }
          }
        },
        {
          name: "Get Inventory Insights",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/inventory/insights",
              host: ["{{baseUrl}}"],
              path: ["api", "inventory", "insights"]
            }
          }
        },
        {
          name: "Create Inventory Item",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/inventory",
              host: ["{{baseUrl}}"],
              path: ["api", "inventory"]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Tomatoes",
                quantity: 10,
                unit: "kg",
                minThreshold: 2,
                costPerUnit: 40
              }, null, 2)
            }
          }
        },
        {
          name: "Update Inventory Item",
          request: {
            method: "PUT",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/inventory/:id",
              host: ["{{baseUrl}}"],
              path: ["api", "inventory", ":id"],
              variable: [{ key: "id", value: "ITEM_ID_HERE" }]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                quantity: 15
              }, null, 2)
            }
          }
        },
        {
          name: "Delete Inventory Item",
          request: {
            method: "DELETE",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/inventory/:id",
              host: ["{{baseUrl}}"],
              path: ["api", "inventory", ":id"],
              variable: [{ key: "id", value: "ITEM_ID_HERE" }]
            }
          }
        }
      ]
    },
    {
      name: "Customers",
      item: [
        {
          name: "Get All Customers",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/customers?search=John",
              host: ["{{baseUrl}}"],
              path: ["api", "customers"],
              query: [{ key: "search", value: "John" }]
            }
          }
        },
        {
          name: "Get Customer by Phone",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/customers/phone/:phone",
              host: ["{{baseUrl}}"],
              path: ["api", "customers", "phone", ":phone"],
              variable: [{ key: "phone", value: "9876543210" }]
            }
          }
        },
        {
          name: "Create/Update Customer",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/customers",
              host: ["{{baseUrl}}"],
              path: ["api", "customers"]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Jane Doe",
                phone: "9123456780",
                email: "jane@example.com",
                address: "123 Street",
                notes: "Regular customer"
              }, null, 2)
            }
          }
        },
        {
          name: "Get Customer History",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/customers/:id/history",
              host: ["{{baseUrl}}"],
              path: ["api", "customers", ":id", "history"],
              variable: [{ key: "id", value: "CUSTOMER_ID_HERE" }]
            }
          }
        }
      ]
    },
    {
      name: "Users (Staff)",
      item: [
        {
          name: "Get All Staff",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/users",
              host: ["{{baseUrl}}"],
              path: ["api", "users"]
            }
          }
        },
        {
          name: "Create Staff Member",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/users",
              host: ["{{baseUrl}}"],
              path: ["api", "users"]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Waiter Bob",
                email: "bob@example.com",
                password: "password123",
                role: "waiter"
              }, null, 2)
            }
          }
        },
        {
          name: "Update Staff Member",
          request: {
            method: "PUT",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/users/:id",
              host: ["{{baseUrl}}"],
              path: ["api", "users", ":id"],
              variable: [{ key: "id", value: "USER_ID_HERE" }]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Bob Updated",
                role: "manager"
              }, null, 2)
            }
          }
        },
        {
          name: "Approve Aadhar",
          request: {
            method: "PATCH",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/users/approve-aadhar/:userId",
              host: ["{{baseUrl}}"],
              path: ["api", "users", "approve-aadhar", ":userId"],
              variable: [{ key: "userId", value: "USER_ID_HERE" }]
            }
          }
        },
        {
          name: "Delete Staff Member",
          request: {
            method: "DELETE",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/users/:id",
              host: ["{{baseUrl}}"],
              path: ["api", "users", ":id"],
              variable: [{ key: "id", value: "USER_ID_HERE" }]
            }
          }
        }
      ]
    },
    {
      name: "Outlets",
      item: [
        {
          name: "Get Current Outlet",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/outlets/current",
              host: ["{{baseUrl}}"],
              path: ["api", "outlets", "current"]
            }
          }
        },
        {
          name: "Update Outlet",
          request: {
            method: "PUT",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/outlets/current",
              host: ["{{baseUrl}}"],
              path: ["api", "outlets", "current"]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "New Restaurant Name",
                address: "New Address",
                phone: "1122334455"
              }, null, 2)
            }
          }
        }
      ]
    },
    {
      name: "Payments",
      item: [
        {
          name: "Get Payments",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/payments?period=month",
              host: ["{{baseUrl}}"],
              path: ["api", "payments"],
              query: [{ key: "period", value: "month" }]
            }
          }
        },
        {
          name: "Get Payment Analytics",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/payments/analytics?period=year",
              host: ["{{baseUrl}}"],
              path: ["api", "payments", "analytics"],
              query: [{ key: "period", value: "year" }]
            }
          }
        }
      ]
    },
    {
      name: "Expenses",
      item: [
        {
          name: "Get All Expenses",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/expenses?period=month",
              host: ["{{baseUrl}}"],
              path: ["api", "expenses"],
              query: [{ key: "period", value: "month" }]
            }
          }
        },
        {
          name: "Create Expense",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/expenses",
              host: ["{{baseUrl}}"],
              path: ["api", "expenses"]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                category: "Utilities",
                description: "Electricity Bill",
                amount: 5000,
                paymentMethod: "Bank Transfer",
                vendor: "Power Corp",
                status: "paid"
              }, null, 2)
            }
          }
        },
        {
          name: "Get Expense Stats",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/expenses/stats/summary",
              host: ["{{baseUrl}}"],
              path: ["api", "expenses", "stats", "summary"]
            }
          }
        }
      ]
    },
    {
      name: "Expense Reminders",
      item: [
        {
          name: "Get All Reminders",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/expense-reminders?upcoming=true",
              host: ["{{baseUrl}}"],
              path: ["api", "expense-reminders"],
              query: [{ key: "upcoming", value: "true" }]
            }
          }
        },
        {
          name: "Create Reminder",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/api/expense-reminders",
              host: ["{{baseUrl}}"],
              path: ["api", "expense-reminders"]
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({
                title: "Pay Rent",
                amount: 25000,
                dueDate: new Date().toISOString(),
                priority: "high",
                frequency: "monthly"
              }, null, 2)
            }
          }
        },
        {
          name: "Complete Reminder",
          request: {
            method: "PATCH",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/expense-reminders/:id/complete",
              host: ["{{baseUrl}}"],
              path: ["api", "expense-reminders", ":id", "complete"],
              variable: [{ key: "id", value: "REMINDER_ID_HERE" }]
            }
          }
        }
      ]
    },
    {
      name: "Upload",
      item: [
        {
          name: "Upload File",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            url: {
              raw: "{{baseUrl}}/api/upload",
              host: ["{{baseUrl}}"],
              path: ["api", "upload"]
            },
            body: {
              mode: "formdata",
              formdata: [
                { key: "image", type: "file", src: [] }
              ]
            }
          }
        }
      ]
    }
  ],
  variable: [
    {
      key: "baseUrl",
      value: "http://localhost:5000",
      type: "string"
    },
    {
      key: "token",
      value: "",
      type: "string"
    }
  ]
};

fs.writeFileSync('Restaurant_Management_System.postman_collection.json', JSON.stringify(collection, null, 2));
console.log('Postman collection created successfully: Restaurant_Management_System.postman_collection.json');
