export default async function getTextFromFile(name: string): Promise<string> {
  const file = await fetch(name);
  return file.text();
}
