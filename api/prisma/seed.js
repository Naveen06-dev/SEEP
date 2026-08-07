import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MySQL database...');

  // 1. Create or upsert Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@seep.com' },
    update: {},
    create: {
      email: 'admin@seep.com',
      passwordHash: 'devpassword123',
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
      department: 'Computer Science'
    }
  });

  // 2. Create or upsert Teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@seep.com' },
    update: {},
    create: {
      email: 'teacher@seep.com',
      passwordHash: 'devpassword123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'TEACHER',
      department: 'Computer Science'
    }
  });

  // 3. Create or upsert Student
  const student = await prisma.user.upsert({
    where: { email: 'student@seep.com' },
    update: {},
    create: {
      email: 'student@seep.com',
      passwordHash: 'devpassword123',
      firstName: 'Alice',
      lastName: 'Smith',
      role: 'STUDENT',
      department: 'Computer Science',
      regNo: 'CS2026001'
    }
  });

  // 4. Create sample exam
  const exam = await prisma.exam.create({
    data: {
      title: 'Data Structures & Algorithms Final',
      subject: 'Computer Science 101',
      department: 'Computer Science',
      durationMinutes: 60,
      scheduleStart: new Date(),
      scheduleEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      negativeMarking: false,
      openBook: false,
      maxAttempts: 1,
      passingPercentage: 40,
      mcqCount: 1,
      codingCount: 1,
      totalMarks: 20,
      status: 'ACTIVE',
      creatorId: teacher.id,
      mcqQuestions: {
        create: [
          {
            sequenceOrder: 1,
            text: 'What is the time complexity of searching in a balanced Binary Search Tree?',
            options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'],
            correctIndex: 1,
            marks: 5,
            negativeMarks: 0,
            difficulty: 'MEDIUM',
            topic: 'Trees'
          }
        ]
      },
      codingQuestions: {
        create: [
          {
            sequenceOrder: 1,
            title: 'Two Sum',
            description: 'Given an array of integers `nums` and an integer `target`, return the two numbers such that they add up to target.',
            inputFormat: 'Line 1: Space-separated integers representing the array.\nLine 2: Single integer target.',
            outputFormat: 'Space-separated pair of integers.',
            constraints: '1 <= nums.length <= 10^4',
            marks: 15,
            timeLimitMs: 2000,
            memoryLimitMB: 128,
            allowedLanguages: ['cpp', 'python', 'javascript', 'java'],
            starterCode: {
              cpp: '#include <iostream>\nusing namespace std;\nint main() {\n  return 0;\n}',
              python: 'def solve():\n    pass\n\nif __name__ == "__main__":\n    solve()',
              javascript: 'const fs = require("fs");\n\nfunction main() {}\nmain();'
            },
            testCases: {
              create: [
                {
                  input: '2 7 11 15\n9',
                  expectedOutput: '2 7',
                  isHidden: false,
                  weight: 1
                },
                {
                  input: '3 2 4\n6',
                  expectedOutput: '2 4',
                  isHidden: true,
                  weight: 2
                }
              ]
            }
          }
        ]
      }
    }
  });

  console.log('Seeding finished successfully!');
  console.log(`Created Exam ID: ${exam.id}`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
