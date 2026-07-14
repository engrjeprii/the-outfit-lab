import json
import sys
import urllib.parse
import requests

ACCOUNT_ID = "eb0cd766e288540134799ff35192b1b6"
BUCKET = "the-outfit-lab-images"
TOKEN = "cfoat_iHvudRoLe8_64rNM-1fAfoNVDaxr0khOo3FJ_7N7dZI.Zjy6cMCx9yPxS7FaWEDk8s-DzxkNgj-JR0b6DFZ_bjs"
D1_DB_ID = "e4d3a882-6967-45d0-bc3a-7554ed36e348"

HEADERS = {"Authorization": f"Bearer {TOKEN}"}


def api_get(url):
    resp = requests.get(url, headers=HEADERS)
    resp.raise_for_status()
    return resp.json()


def api_delete(url):
    resp = requests.delete(url, headers=HEADERS)
    resp.raise_for_status()
    return resp.json()


def list_r2_objects():
    objects = []
    cursor = None
    while True:
        url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/r2/buckets/{BUCKET}/objects"
        if cursor:
            url += f"?cursor={urllib.parse.quote(cursor)}"
        data = api_get(url)
        if not data.get("success"):
            raise RuntimeError(data)
        objects.extend(data.get("result", []))
        cursor = data.get("result_info", {}).get("cursor")
        if not cursor:
            break
    return objects


def list_referenced_keys():
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{D1_DB_ID}/query"
    resp = requests.post(url, headers={**HEADERS, "Content-Type": "application/json"}, json={"sql": "SELECT images FROM products"})
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success"):
        raise RuntimeError(data)
    keys = set()
    for row in data.get("result", [{}])[0].get("results", []):
        for img in json.loads(row["images"] or "[]"):
            key = img.split("/")[-1]
            if key:
                keys.add(key)
    return keys


import sys

ACCOUNT_ID = "eb0cd766e288540134799ff35192b1b6"
BUCKET = "the-outfit-lab-images"
TOKEN = "cfoat_iHvudRoLe8_64rNM-1fAfoNVDaxr0khOo3FJ_7N7dZI.Zjy6cMCx9yPxS7FaWEDk8s-DzxkNgj-JR0b6DFZ_bjs"
D1_DB_ID = "e4d3a882-6967-45d0-bc3a-7554ed36e348"


def main():
    do_delete = "--delete" in sys.argv

    print("Listing R2 objects...")
    objects = list_r2_objects()
    print(f"Total R2 objects: {len(objects)}")

    print("Listing referenced product image keys...")
    referenced = list_referenced_keys()
    print(f"Referenced keys: {len(referenced)}")

    unreferenced = [o for o in objects if o["key"] not in referenced]
    print(f"Unreferenced objects: {len(unreferenced)}")

    if not unreferenced:
        print("Nothing to delete.")
        return

    for o in unreferenced:
        print(f"  - {o['key']} ({o['size']} bytes)")

    total_size = sum(o["size"] for o in unreferenced)
    print(f"\nTotal unreferenced size: {total_size / 1024 / 1024:.2f} MB")

    if not do_delete:
        print("\nRun with --delete to remove these objects.")
        return

    deleted = 0
    for o in unreferenced:
        key = urllib.parse.quote(o["key"], safe="")
        url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/r2/buckets/{BUCKET}/objects/{key}"
        result = api_delete(url)
        if result.get("success"):
            deleted += 1
            print(f"Deleted {o['key']}")
        else:
            print(f"Failed to delete {o['key']}: {result}")

    print(f"\nDeleted {deleted}/{len(unreferenced)} objects.")


if __name__ == "__main__":
    main()
