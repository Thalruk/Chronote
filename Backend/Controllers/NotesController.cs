using Backend.Models;
using Chronote.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Chronote.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public NotesController(ApplicationDbContext context)
    {
        _context = context;
    }
    private string GetUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value ?? string.Empty;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Note>>> GetNotes()
    {
        var userId = GetUserId();

        return await _context.Notes
            .Where(n => n.UserId == userId) 
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Note>> GetNote(Guid id)
    {
        var userId = GetUserId();
        var note = await _context.Notes.FindAsync(id);

        if (note == null || note.UserId != userId)
        {
            return NotFound();
        }

        return note;
    }

    [HttpPost]
    public async Task<ActionResult<Note>> CreateNote(Note note)
    {
        note.Id = Guid.NewGuid();
        note.CreatedAt = DateTime.UtcNow;
        note.UserId = GetUserId(); 

        _context.Notes.Add(note);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetNote), new { id = note.Id }, note);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateNote(Guid id, Note updatedNote)
    {
        if (id != updatedNote.Id)
        {
            return BadRequest();
        }

        var userId = GetUserId();

        var existingNote = await _context.Notes.AsNoTracking().FirstOrDefaultAsync(n => n.Id == id);
        if (existingNote == null || existingNote.UserId != userId)
        {
            return NotFound();
        }

        updatedNote.UserId = userId;
        
        _context.Entry(updatedNote).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNote(Guid id)
    {
        var userId = GetUserId();
        var note = await _context.Notes.FindAsync(id);

        if (note == null || note.UserId != userId)
        {
            return NotFound();
        }

        _context.Notes.Remove(note);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
