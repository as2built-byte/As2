// Simple test to verify the admin search functionality
// This file can be run to test the logic

// Mock data for testing
const mockUsers = [
    {
        uid: '1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        role: 'expert',
        status: 'active',
        createdAt: new Date(),
        enterpriseProfile: undefined
    },
    {
        uid: '2',
        email: 'jane@company.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '0987654321',
        role: 'enterprise',
        status: 'pending',
        createdAt: new Date(),
        enterpriseProfile: {
            uid: '2',
            companyName: 'Tech Corp',
            projectCount: 5,
            hasSubscription: false,
            subscriptionRequestPending: false,
            createdAt: new Date()
        }
    },
    {
        uid: '3',
        email: 'bob@business.com',
        firstName: 'Bob',
        lastName: 'Johnson',
        phone: '5555555555',
        role: 'enterprise',
        status: 'active',
        createdAt: new Date(),
        enterpriseProfile: {
            uid: '3',
            companyName: 'Business Solutions',
            projectCount: 10,
            hasSubscription: true,
            subscriptionRequestPending: false,
            createdAt: new Date()
        }
    }
]

// Test the filtering logic
function testFiltering(users, nameEmailQuery, companyQuery) {
    return users.filter(user => {
        // Name/Email search
        if (nameEmailQuery.trim()) {
            const q = nameEmailQuery.toLowerCase()
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
            const email = (user.email || '').toLowerCase()

            if (!fullName.includes(q) && !email.includes(q)) {
                return false
            }
        }

        // Company name search
        if (companyQuery.trim()) {
            const q = companyQuery.toLowerCase()
            const enterpriseName = (user.enterpriseProfile?.companyName || '').toLowerCase()

            if (!enterpriseName.includes(q)) {
                return false
            }
        }

        return true
    })
}

// Test cases
console.log('=== Testing Admin User Search ===')

// Test 1: Search by name
console.log('\nTest 1: Search by name "John"')
const result1 = testFiltering(mockUsers, 'John', '')
console.log('Results:', result1.map(u => `${u.firstName} ${u.lastName} - ${u.email}`))

// Test 2: Search by email
console.log('\nTest 2: Search by email "jane@"')
const result2 = testFiltering(mockUsers, 'jane@', '')
console.log('Results:', result2.map(u => `${u.firstName} ${u.lastName} - ${u.email}`))

// Test 3: Search by company name
console.log('\nTest 3: Search by company "Tech"')
const result3 = testFiltering(mockUsers, '', 'Tech')
console.log('Results:', result3.map(u => `${u.firstName} ${u.lastName} - ${u.enterpriseProfile?.companyName || 'No company'}`))

// Test 4: Combined search
console.log('\nTest 4: Search by name "Bob" and company "Business"')
const result4 = testFiltering(mockUsers, 'Bob', 'Business')
console.log('Results:', result4.map(u => `${u.firstName} ${u.lastName} - ${u.enterpriseProfile?.companyName || 'No company'}`))

// Test 5: No matches
console.log('\nTest 5: Search by company "Nonexistent"')
const result5 = testFiltering(mockUsers, '', 'Nonexistent')
console.log('Results:', result5.length, 'users found')

console.log('\n=== Test Complete ===')
