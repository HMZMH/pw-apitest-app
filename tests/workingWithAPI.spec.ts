import { test, expect } from '@playwright/test';
import tags from '../test-data/tags.json'; // Importing a JSON object from the 'test-data' folder

test.beforeEach(async ({ page }) => {

  // Intercepting requests to the API endpoint '/api/tags'
  await page.route('*/**/api/tags', async route => {

    // Fulfilling the intercepted request with a predefined JSON response
    await route.fulfill({
      body: JSON.stringify(tags)
    });
  });

  // Intercepting requests to any URL (using a wildard pattern) containing '/api/articles'
  await page.route('*/**/api/articles*', async route => {

    // Fetching the intercepted request to get the response
    const response = await route.fetch();
    const responseBody = await response.json();

    // Modifying the response body before fulfilling the request
    responseBody.articles[0].title = "This is a test title";
    responseBody.articles[0].description = "This is a description";

    // Fulfilling the intercepted request with the modified response body
    await route.fulfill({
      body: JSON.stringify(responseBody)
    });
  });

  // Navigating to the website under test
  await page.goto('https://conduit.bondaracademy.com/');
});

test('has title', async ({ page }) => {
  await page.getByText('Global Feed').click()

  // Checking if the page title matches the expected title 'conduit'
  await expect(page.locator('.navbar-brand')).toHaveText('conduit');

  // Checking if the first article's title and description match the expected modified values
  await expect(page.locator('app-article-list h1').first()).toContainText('This is a test title');
  await expect(page.locator('app-article-list p').first()).toContainText('This is a test title');
});

test('delete article', async({page, request}) => {
  const response = await request.post('https://api.realworld.io/api/users/login', {
    data: {
      "user":{"email":"pwtest@test.com", "password": "Welcome1"}
    }
  })

  const responseBody = await response.json()
  const accessToken = responseBody.user.accessToken

  const articleResponse = await request.post('https://api.realworld.io/api/articles/', {
    data:{
      "article":{"tagList": [], "title": "This is a test title", "description": "This is a test description", "body": "This is a test body"}
    },
    headers:{
      Authorization: 'Token ${accessToken}'
    }
  })
  expect(articleResponse.status()).toEqual(201)

  await page.getByText('Global Feed').click()
  await page.getByText('This is a test title').click()
  await page.getByRole('button', {name: "Delete Article"}).first().click()
  await page.getByText('Global Feed').click()

  await expect(page.locator('app-article-list h1').first()).not.toContainText('This is a test title')
})

test('create article', async({page, request}) => {
  await page.getByText('New Article').click()
  await page.getByRole('textbox', {name: 'Article Title'}).fill('Playwright is awesome')
  await page.getByRole('textbox', {name: 'What\'s this article about?'}).fill('About the Playwright')
  await page.getByRole('textbox', {name: 'Write your article (in markdown)'}).fill('We like to use playwright for automation')
  await page.getByRole('button', {name: "Publish Article"}).click()
  const articleResponse = await page.waitForResponse('https://api.realworld.io/api/articles/')
  const articleResponseBody = await articleResponse.json()
  const slugId = articleResponseBody.article.slug

  await expect (page.locator('.article-page h1')).toContainText('Playwright is awesome')
  await page.getByText('Home').click()
  await page.getByText('Global Feed').click()

  await expect(page.locator('app-article-list h1').first()).toContainText('Playwright is awesome')

  const response = await request.post('https://api.realworld.io/api/users/login', {
    data: {
      "user":{"email": "pwtest@test.com", "password":"Welcome1"}
    }
  })
  const responseBody= await response.json()
  const accessToken = responseBody.user.token

  const deleteArticleResponse = await request.delete('https://api.realworld.io/api/articles/${slugID}', {
    headers: {
      Authorization: 'Token ${accessToken}'
    }
  })
  expect(deleteArticleResponse.status()).toEqual(204)
})